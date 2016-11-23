Rekord.addPlugin(function(model, db, options)
{
  var validation = options.validation || Database.Defaults.validation;

  if ( isEmpty( validation ) )
  {
    return;
  }

  var rules = validation.rules || {};
  var messages = validation.messages || {};
  var aliases = validation.aliases || {};
  var required = !!validation.required;

  function getAlias(field)
  {
    return aliases[ field ] || field;
  }

  db.validations = {};

  for ( var field in rules )
  {
    db.validations[ field ] = Validation.parseRules( rules[ field ], field, db, getAlias, messages[ field ] );
  }

  Class.method( model, '$validate', function(callback, context)
  {
    this.$trigger( Model.Events.PreValidate, [this] );

    this.$valid = true;
    this.$validations = {};
    this.$validationMessages.length = 0;

    var chainEnds = 0;
    var chains = [];

    var onChainEnd = function(chain)
    {
      var model = chain.model;

      if (!chain.valid)
      {
        model.$validations[ chain.field ] = chain.message;
        model.$validationMessages.push( chain.message );
        model.$valid = false;
      }

      if (++chainEnds === chains.length)
      {
        model.$trigger( model.$valid ? Model.Events.ValidatePass : Model.Events.ValidateFail, [model] );

        if ( isFunction( callback ) )
        {
          callback.call( context || model, model.$valid );
        }
      }
    };

    for (var field in db.validations)
    {
      var validations = db.validations[ field ];
      var chain = new ValidationChain( this, field, validations, onChainEnd );

      chains.push( chain );
    }

    for (var i = 0; i < chains.length; i++)
    {
      chains[ i ].start();
    }

    return this.$valid;
  });

  Class.replace( model, '$init', function($init)
  {
    return function()
    {
      this.$valid = undefined;
      this.$validations = {};
      this.$validationMessages = [];

      return $init.apply( this, arguments );
    };
  });

  if ( required )
  {
    Class.replace( model, '$save', function($save)
    {
      return function()
      {
        if ( this.$isDeleted() )
        {
          Rekord.debug( Rekord.Debugs.SAVE_DELETED, this.$db, this );

          return Promise.resolve( this );
        }

        var promise = new Rekord.Promise();
        var modelInstance = this;
        var args = arguments;

        this.$validate(function(valid)
        {
          if (!valid)
          {
            promise.reject( modelInstance );
          }
          else
          {
            var saving = $save.apply( modelInstance, args );

            saving.then( promise.resolve, promise.reject, promise.noline, promise.cancel, promise );
          }
        });

        return promise;
      };
    });
  }
});

Model.Events.PreValidate = 'pre-validate';

Model.Events.ValidatePass = 'validate-pass';

Model.Events.ValidateFail = 'validate-fail';

var Validation =
{
  Rules: {},
  Expression: {},
  Expressions: [],
  Delimiter: /([|])/,
  Escape: '\\',
  RuleSeparator: ':',
  Stop: {},

  parseRules: function(rules, field, database, getAlias, message)
  {
    var validators = [];

    if ( isString( rules ) )
    {
      rules = split( rules, this.Delimiter, this.Escape );
    }

    if ( isArray( rules ) )
    {
      for (var i = 0; i < rules.length; i++)
      {
        var rule = rules[ i ];
        var defaultMessageValidator = this.parseRule( rule, field, database, getAlias, message );

        validators.push( defaultMessageValidator );
      }
    }
    else if ( isObject( rules ) )
    {
      for (var ruleProperty in rules)
      {
        var ruleMessageOrData = rules[ ruleProperty ];

        var ruleMessage = isObject( ruleMessageOrData ) ? ruleMessageOrData.message :
          ( isString( ruleMessageOrData ) ? ruleMessageOrData : undefined );

        var ruleInput = isObject( ruleMessageOrData ) && ruleMessageOrData.message ? ruleMessageOrData.input :
          ( isString( ruleMessageOrData ) ? undefined : ruleMessageOrData );

        var customMessageValidator = this.parseRule( ruleProperty, field, database, getAlias, ruleMessage || message, ruleInput );

        validators.push( customMessageValidator );
      }
    }

    return validators;
  },

  parseRule: function(rule, field, database, getAlias, message, input)
  {
    var colon = rule.indexOf( this.RuleSeparator );
    var ruleName = colon === -1 ? rule : rule.substring( 0, colon );

    if ( ruleName.charAt( 0 ) === '$' )
    {
      return this.customValidator( ruleName, field, database, getAlias, message );
    }

    var ruleParams = colon === -1 ? input : rule.substring( colon + 1 );
    var validatorFactory = Validation.Rules[ ruleName ];

    if ( !validatorFactory )
    {
      throw ruleName + ' is not a valid rule';
    }

    return validatorFactory( field, ruleParams, database, getAlias, message );
  },

  parseExpression: function(expr, database)
  {
    var parsers = Validation.Expressions;

    for (var i = 0; i < parsers.length; i++)
    {
      var parser = parsers[ i ];
      var expressionFunction = parser( expr, database );

      if ( isFunction( expressionFunction ) )
      {
        return expressionFunction; // (value, model)
      }
    }

    return noop;
  },

  customValidator: function(functionName, field, database, getAlias, message)
  {
    return function(value, model, chain)
    {
      var result = model[ functionName ]( value, getAlias, message, chain );

      if ( isString( result ) )
      {
        chain.invalid( result );
      }
      else if ( result !== false )
      {
        chain.next();
      }
    };
  }
};
