/* rekord-validation 1.5.0 - Advanced validation rules for rekord by Philip Diffenderfer */
// UMD (Universal Module Definition)
(function (root, factory)
{
  if (typeof define === 'function' && define.amd) // jshint ignore:line
  {
    // AMD. Register as an anonymous module.
    define(['rekord'], function(Rekord) { // jshint ignore:line
      return factory(root, Rekord);
    });
  }
  else if (typeof module === 'object' && module.exports)  // jshint ignore:line
  {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(global, require('rekord'));  // jshint ignore:line
  }
  else
  {
    // Browser globals (root is window)
    root.Rekord = factory(root, root.Rekord);
  }
}(this, function(global, Rekord, undefined)
{

  var Model = Rekord.Model;
  var Database = Rekord.Database;
  var Promise = Rekord.Promise;
  var Collection = Rekord.Collection;
  var ModelCollection = Rekord.ModelCollection;
  var Class = Rekord.Class;

  var isEmpty = Rekord.isEmpty;
  var isString = Rekord.isString;
  var isArray = Rekord.isArray;
  var isObject = Rekord.isObject;
  var isFunction = Rekord.isFunction;
  var isDate = Rekord.isDate;
  var isNumber = Rekord.isNumber;
  var isBoolean = Rekord.isBoolean;
  var isValue = Rekord.isValue;
  var isPrimitiveArray = Rekord.isPrimitiveArray;
  var isRegExp = Rekord.isRegExp;
  var isRekord = Rekord.isRekord;

  var noop = Rekord.noop;
  var equalsCompare = Rekord.equalsCompare;
  var equals = Rekord.equals;
  var indexOf = Rekord.indexOf;
  var sizeof = Rekord.sizeof;

  var split = Rekord.split;
  var transfer = Rekord.transfer;
  var format = Rekord.format;

  var parseDate = Rekord.parseDate;


function ValidationChain(model, field, validations, onEnd)
{
  this.model = model;
  this.field = field;
  this.validations = validations;
  this.onEnd = onEnd;
}

Class.create( ValidationChain,
{

  reset: function(value)
  {
    this.value = value !== undefined ? value : this.model.$get( this.field );
    this.updated = false;
    this.valid = true;
    this.message = '';
    this.linkIndex = 0;
  },

  start: function(value)
  {
    this.reset( value );
    this.call();
  },

  call: function()
  {
    this.validations[ this.linkIndex ]( this.value, this.model, this );
  },

  update: function(newValue)
  {
    this.value = newValue;
    this.updated = true;

    return this;
  },

  next: function()
  {
    var n = this.validations.length;

    this.linkIndex++;

    if (this.linkIndex === n)
    {
      this.onEnd( this );
    }
    else if (this.linkIndex < n)
    {
      this.call();
    }

    return this;
  },

  stop: function()
  {
    var n = this.validations.length;

    if (this.linkIndex < n)
    {
      this.linkIndex = n - 1;
      this.next();
    }

    return this;
  },

  invalid: function(message)
  {
    this.message = message;
    this.valid = false;
    this.stop();

    return this;
  }

});

function tryParseFloat(x)
{
  var parsed = parseFloat( x );

  if ( !isNaN( parsed ) )
  {
    x = parsed;
  }

  return x;
}

function tryParseInt(x)
{
  var parsed = parseInt( x );

  if ( !isNaN( parsed ) )
  {
    x = parsed;
  }

  return x;
}

function startOfDay(d)
{
  if ( isDate( d ) )
  {
    d.setHours( 0, 0, 0, 0 );
  }
  else if ( isNumber( d ) )
  {
    d = d - (d % 86400000);
  }

  return d;
}

function endOfDay(d)
{
  if ( isDate( d ) )
  {
    d.setHours( 23, 59, 59, 999 );
  }
  else if ( isNumber( d ) )
  {
    d = d - (d % 86400000) + 86400000 - 1;
  }

  return d;
}

function ruleGenerator(ruleName, defaultMessage, isInvalid)
{
  Validation.Rules[ ruleName ] = function(field, params, database, getAlias, message)
  {
    checkNoParams( ruleName, field, params );

    var messageTemplate = determineMessage( ruleName, message );

    return function(value, model, chain)
    {
      if ( isInvalid( value, model, chain ) )
      {
        chain.invalid( generateMessage( field, getAlias( field ), value, model, messageTemplate ) );
      }
      else
      {
        chain.next();
      }
    };
  };

  Validation.Rules[ ruleName ].message = defaultMessage;
}

function determineMessage(ruleName, message)
{
  return message || Validation.Rules[ ruleName ].message;
}

function joinFriendly(arr, lastSeparatorCustom, itemSeparatorCustom, getAlias)
{
  var copy = arr.slice();

  if ( getAlias )
  {
    for (var i = 0; i < copy.length; i++)
    {
      copy[ i ] = getAlias( copy[ i ] );
    }
  }

  var last = copy.pop();
  var lastSeparator = lastSeparatorCustom || 'and';
  var itemSeparator = itemSeparatorCustom || ', ';

  switch (copy.length) {
    case 0:
      return last;
    case 1:
      return copy[ 0 ] + ' ' + lastSeparator + ' ' + last;
    default:
      return copy.join( itemSeparator ) + itemSeparator + lastSeparator + ' ' + last;
  }
}

function mapFromArray(arr, value)
{
  var map = {};

  for (var i = 0; i < arr.length; i++)
  {
    map[ arr[ i ] ] = value;
  }

  return map;
}

function checkNoParams(ruleName, field, params)
{
  if ( params )
  {
    throw 'the rule ' + ruleName + ' for field ' + field + ' has no arguments';
  }
}

function generateMessage(field, alias, value, model, message, extra)
{
  if ( isFunction( message ) )
  {
    message = message( field, alias, value, model, extra );
  }

  var base = {};
  base.$field = field;
  base.$alias = alias;
  base.$value = value;

  transfer( model, base );

  if ( isObject( extra ) )
  {
    transfer( extra, base );
  }

  return format( message, base );
}

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

Validation.Expression.date =
Validation.Expressions.push(function(expr, database)
{
  var parsed = parseDate( expr );

  if ( parsed !== false )
  {
    var parsedTime = parsed.getTime();

    return function(value, model)
    {
      return parsedTime;
    };
  }
}) - 1;

Validation.Expression.field =
Validation.Expressions.push(function(expr, database)
{
  if ( indexOf( database.fields, expr ) )
  {
    return function(value, model)
    {
      return model.$get( expr );
    };
  }
}) - 1;


var RELATIVE_REGEX = /^([+-]\d+(\.\d+)?)\s*(.+)$/;

var RELATIVE_UNITS = {
  ms: 1,
  millisecond: 1,
  milliseconds: 1,
  s: 1000,
  second: 1000,
  seconds: 1000,
  min: 1000 * 60,
  mins: 1000 * 60,
  minute: 1000 * 60,
  minutes: 1000 * 60,
  hr: 1000 * 60 * 60,
  hour: 1000 * 60 * 60,
  hours: 1000 * 60 * 60,
  day: 1000 * 60 * 60 * 24,
  days: 1000 * 60 * 60 * 24,
  wk: 1000 * 60 * 60 * 24 * 7,
  week: 1000 * 60 * 60 * 24 * 7,
  weeks: 1000 * 60 * 60 * 24 * 7,
  month: ['getMonth', 'setMonth'],
  months: ['getMonth', 'setMonth'],
  yr: ['getFullYear', 'setFullYear'],
  year: ['getFullYear', 'setFullYear'],
  years: ['getFullYear', 'setFullYear']
};

Validation.Expression.relative =
Validation.Expressions.push(function(expr, database)
{
  var parsed = RELATIVE_REGEX.exec( expr );

  if ( parsed !== null )
  {
    var amount = parseFloat( parsed[ 1 ] );
    var unit = parsed[ 3 ];
    var unitScale = RELATIVE_UNITS[ unit ];

    if ( !unitScale )
    {
      throw unit + ' is not a valid unit.';
    }

    return function(value, model)
    {
      var relative = new Date();

      if ( isNumber( unitScale ) )
      {
        relative.setTime( relative.getTime() + unitScale * amount );
      }
      else
      {
        var getter = unitScale[0];
        var setter = unitScale[1];

        relative[ setter ]( relative[ getter ]() + amount );
      }

      return relative.getTime();
    };
  }
}) - 1;

Validation.Expression.today =
Validation.Expressions.push(function(expr, database)
{
  if ( expr === 'today' )
  {
    return function(value, model)
    {
      var today = new Date();

      startOfDay( today );

      return today.getTime();
    };
  }
}) - 1;

Validation.Expression.tomorrow =
Validation.Expressions.push(function(expr, database)
{
  if ( expr === 'tomorrow' )
  {
    return function(value, model)
    {
      var tomorrow = new Date();

      tomorrow.setDate( tomorrow.getDate() + 1 );
      startOfDay( tomorrow );

      return tomorrow.getTime();
    };
  }
}) - 1;

Validation.Expression.yesterday =
Validation.Expressions.push(function(expr, database)
{
  if ( expr === 'yesterday' )
  {
    return function(value, model)
    {
      var yesterday = new Date();

      yesterday.setDate( yesterday.getDate() - 1 );
      startOfDay( yesterday );

      return yesterday.getTime();
    };
  }
}) - 1;

// accepted
Validation.Rules.accepted = function(field, params, database, getAlias, message)
{
  checkNoParams( 'accepted', field, params );

  var messageTemplate = determineMessage( 'accepted', message );
  var acceptable = Validation.Rules.accepted.acceptable;

  return function(value, model, chain)
  {
    var valueString = (value + '').toLowerCase();
    var accepted = acceptable[ valueString ];

    if ( !accepted )
    {
      chain.invalid( generateMessage( field, getAlias( field ), value, model, messageTemplate ) );
    }
    else
    {
      chain.next();
    }
  };
};

Validation.Rules.accepted.message = '{$alias} has not been accepted.';

Validation.Rules.accepted.acceptable =
{
  '1':    true,
  'yes':  true,
  'on':   true,
  'y':    true,
  'true': true
};

// contains:field,value
collectionRuleGenerator('contains',
  '{$alias} does not contain an item whose {$matchAlias} equals {$matchValue}.',
  function isInvalid(value, model, matchField, matchValue, equality)
  {
    return !value.contains(function isMatch(m)
    {
      return m !== model && equality( matchValue, m.$get( matchField ) );
    });
  }
);

// not_contains:field,value
collectionRuleGenerator('not_contains',
  '{$alias} contains an item whose {$matchAlias} equals {$matchValue}.',
  function isInvalid(value, model, matchField, matchValue, equality)
  {
    return value.contains(function isMatch(m)
    {
      return m !== model && equality( matchValue, m.$get( matchField ) );
    });
  }
);

function collectionRuleGenerator(ruleName, defaultMessage, isInvalid)
{
  Validation.Rules[ ruleName ] = function(field, params, database, getAlias, message)
  {
    if ( !params )
    {
      throw ruleName + ' validation rule requires field & value arguments';
    }

    var matchField, matchValue, equality;

    if ( isString( params ) )
    {
      var comma = params.indexOf(',');

      if ( comma === -1 )
      {
        throw ruleName + ' validation rule requires field & value arguments';
      }

      matchField = params.substring( 0, comma );
      matchValue = params.substring( comma + 1 );
    }
    else if ( isArray( params ) )
    {
      matchField = params[ 0 ];
      matchValue = params[ 1 ];
      equality = params[ 2 ];
    }
    else if ( isObject( params ) )
    {
      matchField = params.field;
      matchValue = params.value;
      equality = params.equals;
    }

    if ( !isFunction( equality ) )
    {
      equality = equalsCompare;
    }

    if ( indexOf( database.fields, matchField ) === -1 )
    {
      throw matchField + ' is not a valid field for the ' + ruleName + ' rule';
    }

    var messageTemplate = determineMessage( ruleName, message );
    var extra = {
      $matchField: matchField,
      $matchAlias: getAlias( matchField ),
      $matchValue: matchValue
    };

    return function(value, model, chain)
    {
      if ( isInvalid( value, model, matchField, matchValue, equality ) )
      {
        chain.invalid( generateMessage( field, getAlias( field ), value, model, messageTemplate, extra ) );
      }
      else
      {
        chain.next();
      }
    };
  };

  Validation.Rules[ ruleName ].message = defaultMessage;
}

Validation.Rules.validate = function(field, params, database, getAlias, message)
{
  // message, models, validations
  var messageOption = params || 'message';
  var messageTemplate = determineMessage( 'validate', message );

  return function(value, model, chain)
  {
    if ( isArray( value ) )
    {
      var invalid = new Collection();

      for (var i = 0; i < value.length; i++)
      {
        var related = value[ i ];

        if ( related && related.$validate && !related.$validate() )
        {
          invalid.push( related );
        }
      }

      if ( invalid.length )
      {
        switch (messageOption)
        {
          case 'models':
            chain.invalid( invalid );
            break;
          case 'validations':
            chain.invalid( invalid.pluck( '$validations', '$$key' ) );
            break;
          default: // message
            chain.invalid( generateMessage( field, getAlias( field ), value, model, messageTemplate ) );
            break;
        }
      }
      else
      {
        chain.next();
      }
    }
    else
    {
      chain.next();
    }
  };
};

Validation.Rules.validate.message = '{$alias} is not valid.';

// after:today
dateRuleGenerator('after',
  '{$alias} must be after {$date}.',
  function isInvalid(value, date) {
    return value < endOfDay( date );
  }
);

// after_on:tomorrow
dateRuleGenerator('after_on',
  '{$alias} must be after or equal to {$date}.',
  function isInvalid(value, date) {
    return value < date;
  }
);

// before:yesterday
dateRuleGenerator('before',
  '{$alias} must be before {$date}.',
  function isInvalid(value, date) {
    return value > date;
  }
);

// before_on:+2days
dateRuleGenerator('before_on',
  '{$alias} must be before or equal to {$date}.',
  function isInvalid(value, date) {
    return value > endOfDay( date );
  }
);

// date
ruleGenerator('date_like',
  '{$alias} must be a valid date.',
  function isInvalid(value, model, chain) {
    var parsed = parseDate( value );
    var invalid = parsed === false;
    if ( !invalid ) {
      chain.update( parsed.getTime() );
    }
    return invalid;
  }
);

function dateRuleGenerator(ruleName, defaultMessage, isInvalid)
{
  Validation.Rules[ ruleName ] = function(field, params, database, getAlias, message)
  {
    if ( !params )
    {
      throw ruleName + ' validation rule requires a date expression argument';
    }

    var dateExpression;

    if ( isString( params ) )
    {
      dateExpression = Validation.parseExpression( params, database );
    }
    else if ( isFunction( params ) )
    {
      dateExpression = params;
    }
    else
    {
      var parsed = parseDate( params );

      if ( parsed !== false )
      {
        var parsedTime = parsed.getTime();

        dateExpression = function()
        {
          return parsedTime;
        };
      }
    }

    if ( !dateExpression || dateExpression === noop )
    {
      throw params + ' is not a valid date expression for the ' + ruleName + ' rule';
    }

    var messageTemplate = determineMessage( ruleName, message );
    var extra = {
      $date: params
    };

    return function(value, model, chain)
    {
      var parsed = parseDate( value );

      if ( parsed !== false )
      {
        value = parsed.getTime();

        var date = dateExpression( value, model );

        if ( isNumber( date ) && isInvalid( value, date ) )
        {
          chain.invalid( generateMessage( field, getAlias( field ), value, model, messageTemplate, extra ) );
        }
        else
        {
          chain.next();
        }
      }
      else
      {
        chain.next();
      }
    };
  };

  Validation.Rules[ ruleName ].message = defaultMessage;
}


// required_if:X,Y,...
fieldListRuleGenerator('required_if',
  '{$alias} is required.',
  function isInvalid(value, model, field, values, map) {
    var required = map[ model.$get( field ) ];

    return required && isEmpty( value );
  }
);

// required_unless:X,Y,...
fieldListRuleGenerator('required_unless',
  '{$alias} is required.',
  function isInvalid(value, model, field, values, map) {
    var required = !map[ model.$get( field ) ];

    return required && isEmpty( value );
  }
);

function fieldListRuleGenerator(ruleName, defaultMessage, isInvalid)
{
  Validation.Rules[ ruleName ] = function(field, params, database, getAlias, message)
  {
    if ( !params )
    {
      throw ruleName + ' validation rule requires a field and list arguments';
    }

    var matchField, matchValues;

    if ( isString( params ) )
    {
      var parts = split( params, /(,)/, '\\' );

      matchField = parts.shift();
      matchValues = parts;
    }
    else if ( isArray( params ) )
    {
      matchField = params.shift();
      matchValues = params;
    }
    else if ( isObject( params ) )
    {
      matchField = params.field;
      matchValues = params.values;
    }

    if ( indexOf( database.fields, matchField ) === false )
    {
      throw matchField + ' is not a valid field for the ' + ruleName + ' rule';
    }

    var messageTemplate = determineMessage( ruleName, message );
    var list = joinFriendly( matchValues );
    var extra = {
      $params: params,
      $matchField: matchField,
      $matchAlias: getAlias( matchField ),
      $list: list
    };
    var map = mapFromArray( matchValues, true );

    return function(value, model, chain)
    {
      if ( isInvalid( value, model, matchField, matchValues, map ) )
      {
        chain.invalid( generateMessage( field, getAlias( field ), value, model, messageTemplate, extra ) );
      }
      else
      {
        chain.next();
      }
    };
  };

  Validation.Rules[ ruleName ].message = defaultMessage;
}

// confirmed:X
fieldsRuleGenerator('confirmed',
  '{$alias} must match {$fieldAliases}.',
  function isInvalid(value, model, fields, chain) {
    var confirmed = true;

    for (var i = 0; i < fields.length; i++)
    {
      if ( !equals( value, model.$get( fields[ i ] ) ) )
      {
        confirmed = false;
      }
    }

    return !confirmed;
  }
);

// different:X
fieldsRuleGenerator('different',
  '{$alias} must not match {$fieldAliases}.',
  function isInvalid(value, model, fields, chain) {
    var different = false;

    for (var i = 0; i < fields.length; i++)
    {
      if ( !equals( value, model.$get( fields[ i ] ) ) )
      {
        different = true;
      }
    }

    return !different;
  }
);

// if_valid:X
fieldsRuleGenerator('if_valid',
  '',
  function isInvalid(value, model, fields, chain) {
    var valid = true;

    for (var i = 0; i < fields.length && valid; i++)
    {
      if ( model.$validations[ fields[ i ] ] )
      {
        valid = false;
      }
    }

    if ( !valid )
    {
      chain.stop();
    }

    return false;
  }
);

// The field under validation must be present only if any of the other specified fields are present.
// required_with:X,Y,...
fieldsRuleGenerator('required_with',
  '{$alias} is required.',
  function isInvalid(value, model, fields, chain) {
    var required = false;

    for (var i = 0; i < fields.length && !required; i++)
    {
      if ( !isEmpty( model.$get( fields[ i ] ) ) )
      {
        required = true;
      }
    }

    return required && isEmpty( value );
  }
);

// The field under validation must be present only if all of the other specified fields are present.
// required_with_all:X,Y,...
fieldsRuleGenerator('required_with_all',
  '{$alias} is required.',
  function isInvalid(value, model, fields, chain) {
    var required = true;

    for (var i = 0; i < fields.length && required; i++)
    {
      if ( isEmpty( model.$get( fields[ i ] ) ) )
      {
        required = false;
      }
    }

    return required && isEmpty( value );
  }
);

// The field under validation must be present only when any of the other specified fields are not present.
// required_without:X,Y,...
fieldsRuleGenerator('required_without',
  '{$alias} is required.',
  function isInvalid(value, model, fields, chain) {
    var required = false;

    for (var i = 0; i < fields.length && !required; i++)
    {
      if ( isEmpty( model.$get( fields[ i ] ) ) )
      {
        required = true;
      }
    }

    return required && isEmpty( value );
  }
);

// The field under validation must be present only when all of the other specified fields are not present.
// required_without_all:X,Y,...
fieldsRuleGenerator('required_without_all',
  '{$alias} is required.',
  function isInvalid(value, model, fields, chain) {
    var required = true;

    for (var i = 0; i < fields.length && required; i++)
    {
      if ( !isEmpty( model.$get( fields[ i ] ) ) )
      {
        required = false;
      }
    }

    return required && isEmpty( value );
  }
);

function fieldsRuleGenerator(ruleName, defaultMessage, isInvalid)
{
  Validation.Rules[ ruleName ] = function(field, params, database, getAlias, message)
  {
    if ( !params )
    {
      throw ruleName + ' validation rule requires an array of fields argument';
    }

    var fields = split( params, /(\s*,\s*)/, '\\' );

    for (var i = 0; i < fields.length; i++)
    {
      if ( indexOf( database.fields, fields[ i ] ) === -1 )
      {
        throw fields[ i ] + ' is not a valid field for the ' + ruleName + ' rule';
      }
    }

    var messageTemplate = determineMessage( ruleName, message );
    var fieldNames = joinFriendly( fields );
    var fieldAliases = joinFriendly( fields, false, false, getAlias );
    var extra = {
      $fields: fieldNames,
      $fieldAliases: fieldAliases
    };

    return function(value, model, chain)
    {
      if ( isInvalid( value, model, fields, chain ) )
      {
        chain.invalid( generateMessage( field, getAlias( field ), value, model, messageTemplate, extra ) );
      }
      else
      {
        chain.next();
      }
    };
  };

  Validation.Rules[ ruleName ].message = defaultMessage;
}

// exists:X,Y
foreignRuleGenerator('exists',
  '{$alias} must match an existing {$matchAlias} in a {$class}',
  function isInvalid(value, model, models, fieldName)
  {
    return !models.contains(function isDifferentMatch(m)
    {
      return m !== model && equals( value, m.$get( fieldName ) );
    });
  }
);

// unique:X,Y
foreignRuleGenerator('unique',
  '{$alias} must be a unique {$matchAlias} in a {$class}',
  function isInvalid(value, model, models, fieldName)
  {
    return models.contains(function isDifferentMatch(m)
    {
      return m !== model && equals( value, m.$get( fieldName ) );
    });
  }
);

// 'ruleName'
// 'ruleName:name'
// 'ruleName:,field'
// 'ruleName:name,field'
// 'ruleName:name,field': '...'
// 'ruleName': {input: {field: 'field', model: 'name'}, message: '...'}
// 'ruleName': {input: {field: 'field', model: ModelClass}, message: '...'}
// 'ruleName': {input: {field: 'field', models: [...]}, message: '...'}
// 'ruleName': {field: 'field', model: 'name'}
// 'ruleName': {field: 'field', model: ModelClass}
// 'ruleName': {field: 'field', models: [...]}
function foreignRuleGenerator(ruleName, defaultMessage, isInvalid)
{
  Validation.Rules[ ruleName ] = function(field, params, database, getAlias, message)
  {
    var modelName, models, fieldName;

    if ( !isValue( params ) || isString( params ) )
    {
      var parts = split( params || '', /(\s*,\s*)/, '\\' );
      modelName = parts[0] || database.name;
      fieldName = parts[1] || field;
      models = null;
    }
    else if ( isArray( params ) )
    {
      modelName = isString( params[0] ) ? params.shift() : database.name;
      fieldName = isString( params[0] ) ? params.shift() : field;
      models = new ModelCollection( database, params );
    }
    else if ( isObject( params ) )
    {
      modelName = params.model || database.name;
      fieldName = params.field || field;
      models = params.models;
    }

    if ( !models )
    {
      if ( !modelName )
      {
        throw 'model, model class, or models is required for ' + ruleName + ' rule';
      }

      if ( isString( modelName ) )
      {
        Rekord.get( modelName ).success(function(modelClass)
        {
          models = modelClass.all();
        });
      }
      else if ( isRekord( modelName ) )
      {
        models = modelName.all();
      }
    }

    if ( indexOf( database.fields, fieldName ) === false )
    {
      throw fieldName + ' is not a valid field for the ' + ruleName + ' rule';
    }

    var messageTemplate = determineMessage( ruleName, message );
    var extra = {
      $class: modelName,
      $matchField: fieldName,
      $matchAlias: getAlias( fieldName )
    };

    return function(value, model, chain)
    {
      if ( models && isValue( value ) )
      {
        if ( isInvalid( value, model, models, fieldName ) )
        {
          chain.invalid( generateMessage( field, getAlias( field ), value, model, messageTemplate, extra ) );
        }
        else
        {
          chain.next();
        }
      }
      else
      {
        chain.next();
      }
    };
  };

  Validation.Rules[ ruleName ].message = defaultMessage;
}

// if:due_date:before:today|required

// if all rules pass for the given field, continue with remaining rules
subRuleGenerator('if',
  function isInvalid(invalidCount, totalCount) {
    return invalidCount > 0;
  }
);

// if any rules pass for the given field, continue with remaining rules
subRuleGenerator('if_any',
  function isInvalid(invalidCount, totalCount) {
    return invalidCount >= totalCount;
  }
);

// if no rules pass for the given field, continue with remaining rules
subRuleGenerator('if_not',
  function isInvalid(invalidCount, totalCount) {
    return invalidCount < totalCount;
  }
);



function subRuleGenerator(ruleName, isInvalid)
{
  Validation.Rules[ ruleName ] = function(field, params, database, getAlias, message)
  {
    if ( !params )
    {
      throw ruleName + ' validation rule requires a validation rule argument';
    }

    var otherField, otherRules;

    if ( isString( params ) )
    {
      var colon = params.indexOf( ':' );

      if ( colon === -1 )
      {
        throw params + ' is not a valid argument for the ' + ruleName + ' rule';
      }

      otherField = params.substring( 0, colon ) || field;
      otherRules = params.substring( colon + 1 );
    }
    else if ( isArray( params ) )
    {
      otherField = params.shift() || field;
      otherRules = params;
    }
    else if ( isObject( params ) )
    {
      otherField = params.field || field;
      otherRules = params.rules;
    }

    if ( indexOf( database.fields, otherField ) === -1 )
    {
      throw otherField + ' is not a valid field for the ' + ruleName + ' rule';
    }

    if ( !otherRules )
    {
      throw 'rules are required for the ' + ruleName + ' rule';
    }

    var validators = Validation.parseRules( otherRules, otherField, database, getAlias );

    return function(value, model, chain)
    {
      var invalids = 0;
      var chainCount = 0;

      var onChainEnd = function(innerChain)
      {
        if (!innerChain.valid)
        {
          invalids++;
        }

        if (++chainCount === validators.length)
        {
          if ( isInvalid( invalids, chainCount ) )
          {
            chain.stop();
          }
          else
          {
            chain.next();
          }
        }
      };

      var testValue = otherField === field ? value : model.$get( otherField );

      for (var i = 0; i < validators.length; i++)
      {
        var innerChain = new ValidationChain( model, otherField, [validators[ i ]], onChainEnd );

        innerChain.start( testValue );
      }
    };
  };
}

// in:X,Y,Z,...
listRuleGenerator('in',
  '{$alias} must be one of {$list}.',
  function isInvalid(value, model, inList)
  {
    return !inList( value, model );
  }
);

// not_in:X,Y,Z,...
listRuleGenerator('not_in',
  '{$alias} must not be one of {$list}.',
  function isInvalid(value, model, inList)
  {
    return inList( value, model );
  }
);

function listRuleGenerator(ruleName, defaultMessage, isInvalid)
{
  Validation.Rules[ ruleName ] = function(field, params, database, getAlias, message)
  {
    if ( !params )
    {
      throw ruleName + ' validation rule requires a list argument';
    }

    var values, inList = false;

    if ( isString( params ) )
    {
      values = split( params, /(,)/, '\\' );
    }
    else if ( isArray( params ) )
    {
      values = params;
    }
    else if ( isFunction( params ) )
    {
      values = inList;
    }

    if ( inList !== false )
    {
      if ( !values || values.length === 0 )
      {
        throw params + ' is not a valid list of values for the ' + ruleName + ' rule';
      }
    }

    if ( isPrimitiveArray( values ) )
    {
      var map = mapFromArray( values, true );

      inList = function(value)
      {
        return map[ value ];
      };
    }
    else
    {
      inList = function(value)
      {
        return indexOf( values, value, equals );
      };
    }

    var messageTemplate = determineMessage( ruleName, message );
    var list = joinFriendly( values, 'or' );
    var extra = {
      $params: params,
      $list: list
    };

    return function(value, model, chain)
    {
      if ( isInvalid( value, model, inList ) )
      {
        chain.invalid( generateMessage( field, getAlias( field ), value, model, messageTemplate, extra ) );
      }
      else
      {
        chain.next();
      }
    };
  };


  Validation.Rules[ ruleName ].message = defaultMessage;
}

// between:3,10
rangeRuleGenerator('between', {
    'string': '{$alias} must have between {$start} to {$end} characters.',
    'number': '{$alias} must be between {$start} and {$end}.',
    'object': '{$alias} must have between {$start} to {$end} items.'
  },
  function isInvalid(value, start, end) {
    return value < start || value > end;
  }
);

// not_between
rangeRuleGenerator('not_between', {
    'string': '{$alias} must not have between {$start} to {$end} characters.',
    'number': '{$alias} must not be between {$start} and {$end}.',
    'object': '{$alias} must not have between {$start} to {$end} items.'
  },
  function isInvalid(value, start, end) {
    return value >= start && value <= end;
  }
);

function rangeRuleGenerator(ruleName, defaultMessages, isInvalid)
{
  Validation.Rules[ ruleName ] = function(field, params, database, getAlias, message)
  {
    if ( !params )
    {
      throw ruleName + ' validation rule requires a range argument';
    }

    var start, end;

    if ( isString( params ) )
    {
      var range = split( params, /(\s*,\s*)/, '\\' );

      start = parseFloat( range[0] );
      end = parseFloat( range[1] );
    }
    else if ( isArray( params ) )
    {
      start = params[ 0 ];
      end = params[ 1 ];
    }
    else if ( isObject( params ) )
    {
      start = params.start;
      end = params.end;
    }

    if ( isNaN( start ) || isNaN( end ) )
    {
      throw params + ' is not a valid range of numbers for the ' + ruleName + ' rule';
    }

    if ( isString( message ) )
    {
      message = {
        'string': message,
        'number': message,
        'object': message
      };
    }

    var messageTemplate = determineMessage( ruleName, message );
    var extra = {
      $start: start,
      $end: end
    };

    return function(value, model, chain)
    {
      var size = sizeof( value );
      var type = typeof( value );
      var typeMessage = messageTemplate[ type ];

      if ( typeMessage && isInvalid( size, start, end ) )
      {
        extra.$size = size;

        chain.invalid( generateMessage( field, getAlias( field ), value, model, typeMessage, extra ) );
      }
      else
      {
        chain.next();
      }
    };
  };

  Validation.Rules[ ruleName ].message = defaultMessages;
}



regexRuleGenerator('alpha',
  '{$alias} should only contain alphabetic characters.',
    /^[a-zA-Z]*$/
);

regexRuleGenerator('alpha_dash',
  '{$alias} should only contain alpha-numeric characters, dashes, and underscores.',
  /^[a-zA-Z0-9_-]*$/
);

regexRuleGenerator('alpha_num',
  '{$alias} should only contain alpha-numeric characters.',
  /^[a-zA-Z0-9]*$/
);

regexRuleGenerator('email',
  '{$alias} is not a valid email.',
  /^.+@.+\..+$/
);

regexRuleGenerator('url',
  '{$alias} is not a valid URL.',
  /^(https?:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/
);

regexRuleGenerator('uri',
  '{$alias} is not a valid URI.',
  /^(\w+:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/
);

regexRuleGenerator('phone',
  '{$alias} is not a valid phone number.',
  /^1?\W*([2-9][0-8][0-9])\W*([2-9][0-9]{2})\W*([0-9]{4})(\se?x?t?(\d*))?$/
);

function regexRuleGenerator(ruleName, defaultMessage, regex)
{
  Validation.Rules[ ruleName ] = function(field, params, database, getAlias, message)
  {
    checkNoParams( ruleName, field, params );

    var messageTemplate = determineMessage( ruleName, message );

    return function(value, model, chain)
    {
      if ( !regex.test( value ) )
      {
        chain.invalid( generateMessage( field, getAlias( field ), value, model, messageTemplate ) );
      }
      else
      {
        chain.next();
      }

      return value;
    };
  };

  Validation.Rules[ ruleName ].message = defaultMessage;
}

Validation.Rules.regex = function(field, params, database, getAlias, message)
{
  var regex;

  if ( isString( params ) )
  {
    var parsed = /^\/(.*)\/([gmi]*)$/.exec( params );

    if ( parsed )
    {
      regex = new RegExp( parsed[1], parsed[2] );
    }
  }
  else if ( isRegExp( params ) )
  {
    regex = params;
  }

  if ( !regex )
  {
    throw params + ' is not a valid regular expression for the regex rule';
  }

  var messageTemplate = determineMessage( 'regex', message );

  return function(value, model, chain)
  {
    if ( !regex.test( value ) )
    {
      chain.invalid( generateMessage( field, getAlias( field ), value, model, messageTemplate ) );
    }
    else
    {
      chain.next();
    }
  };
};

Validation.Rules.regex.message = '{$alias} is not a valid value.';

// required
ruleGenerator('required',
  '{$alias} is required.',
  function isInvalid(value) {
    return isEmpty( value );
  }
);

// min:3
sizeRuleGenerator('min', {
    'string': '{$alias} must have a minimum of {$number} characters.',
    'number': '{$alias} must be at least {$number}.',
    'object': '{$alias} must have at least {$number} items.'
  },
  function isInvalid(value, number) {
    return value < number;
  }
);

// greater_than:0
sizeRuleGenerator('greater_than', {
    'string': '{$alias} must have more than {$number} characters.',
    'number': '{$alias} must be greater than {$number}.',
    'object': '{$alias} must have more than {$number} items.'
  },
  function isInvalid(value, number) {
    return value <= number;
  }
);

// max:10
sizeRuleGenerator('max', {
    'string': '{$alias} must have no more than {$number} characters.',
    'number': '{$alias} must be no more than {$number}.',
    'object': '{$alias} must have no more than {$number} items.'
  },
  function isInvalid(value, number) {
    return value > number;
  }
);

// less_than:5
sizeRuleGenerator('less_than', {
    'string': '{$alias} must have less than {$number} characters.',
    'number': '{$alias} must be less than {$number}.',
    'object': '{$alias} must have less than {$number} items.'
  },
  function isInvalid(value, number) {
    return value >= number;
  }
);

// equal:4.5
sizeRuleGenerator('equal', {
    'string': '{$alias} must have {$number} characters.',
    'number': '{$alias} must equal {$number}.',
    'object': '{$alias} must have {$number} items.'
  },
  function isInvalid(value, number) {
    return value !== number;
  }
);

// not_equal:0
sizeRuleGenerator('not_equal', {
    'string': '{$alias} must not have {$number} characters.',
    'number': '{$alias} must not equal {$number}.',
    'object': '{$alias} must not have {$number} items.'
  },
  function isInvalid(value, number) {
    return value === number;
  }
);

function sizeRuleGenerator(ruleName, defaultMessages, isInvalid)
{
  Validation.Rules[ ruleName ] = function(field, params, database, getAlias, message)
  {
    var number;

    if ( isString( params ) )
    {
      number = parseFloat( params );
    }
    else if ( isNumber( params ) )
    {
      number = params;
    }

    if ( isNaN( number ) )
    {
      throw '"' + params + '" is not a valid number for the ' + ruleName + ' rule';
    }

    if ( isString( message ) )
    {
      message = {
        'string': message,
        'number': message,
        'object': message
      };
    }

    var messageTemplate = determineMessage( ruleName, message );
    var extra = {
      $number: params
    };

    return function(value, model, chain)
    {
      var size = sizeof( value );
      var type = typeof( value );
      var typeMessage = messageTemplate[ type ];

      if ( typeMessage && isInvalid( size, number ) )
      {
        extra.$size = size;

        chain.invalid( generateMessage( field, getAlias( field ), value, model, typeMessage, extra ) );
      }
      else
      {
        chain.next();
      }
    };
  };

  Validation.Rules[ ruleName ].message = defaultMessages;
}


ruleGenerator('array',
  '{$alias} must be an array.',
  function isInvalid(value) {
    return !isArray( value );
  }
);

ruleGenerator('object',
  '{$alias} must be an object.',
  function isInvalid(value) {
    return !isObject( value );
  }
);

ruleGenerator('string',
  '{$alias} must be a string.',
  function isInvalid(value) {
    return !isString( value );
  }
);

ruleGenerator('number',
  '{$alias} must be a number.',
  function isInvalid(value) {
    return !isNumber( value );
  }
);

ruleGenerator('boolean',
  '{$alias} must be a true or false.',
  function isInvalid(value) {
    return !isBoolean( value );
  }
);

ruleGenerator('model',
  '{$alias} must have a value.',
  function isInvalid(value) {
    return !(value instanceof Model);
  }
);

ruleGenerator('whole',
  '{$alias} must be a whole number.',
  function isInvalid(value, model, chain) {
    var parsed = tryParseInt( value );
    var numeric = parseFloat( value );
    var invalid = !isNumber( parsed );
    if ( !invalid ) {
      invalid = Math.floor( parsed ) !== numeric;
      if ( !invalid ) {
        chain.update( parsed );
      }
    }
    return invalid;
  }
);

ruleGenerator('numeric',
  '{$alias} must be numeric.',
  function isInvalid(value, model, chain) {
    var parsed = tryParseFloat( value );
    var invalid = !isNumber( parsed );
    if ( !invalid ) {
      chain.update( parsed );
    }
    return invalid;
  }
);

ruleGenerator('yesno',
  '{$alias} must be a yes or no.',
  function isInvalid(value, model, chain) {
    var mapped = Validation.Rules.yesno.map[ value ];
    var invalid = !isBoolean( mapped );
    if ( !invalid ) {
      chain.update( mapped );
    }
    return invalid;
  }
);

Validation.Rules.yesno.map =
{
  'true':   true,
  't':      true,
  'yes':    true,
  'y':      true,
  '1':      true,
  'false':  false,
  'f':      false,
  'no':     false,
  'n':      false,
  '0':      false
};

Validation.Rules.abs = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    value = tryParseFloat( value );

    if ( isNumber( value ) )
    {
      chain.update( Math.abs( value ) );
    }

    chain.next();
  };
};

Validation.Rules.apply = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    model.$set( field, value );

    chain.next();
  };
};

Validation.Rules.base64 = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    if ( global.btoa )
    {
      chain.update( global.btoa( value ) );
    }

    chain.next();
  };
};

Validation.Rules.ceil = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    value = tryParseFloat( value );

    if ( isNumber( value ) )
    {
      chain.update( Math.ceil( value ) );
    }

    chain.next();
  };
};

Validation.Rules.endOfDay = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    chain.update( endOfDay( value ) );
    
    chain.next();
  };
};

Validation.Rules.filter = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    if ( isArray( value ) )
    {
      for (var i = value.length - 1; i >= 0; i--)
      {
        if ( !isValue( value[ i ] ) )
        {
          value.splice( i, 1 );
        }
      }

      chain.update( value );
    }
    else if ( isObject( value ) )
    {
      for (var prop in value)
      {
        if ( !isValue( value[ prop ] ) )
        {
          delete value[ prop ];
        }
      }

      chain.update( value );
    }

    chain.next();
  };
};

Validation.Rules.floor = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    value = tryParseFloat( value );

    if ( isNumber( value ) )
    {
      chain.update( Math.floor( value ) );
    }

    chain.next();
  };
};

Validation.Rules.mod = function(field, params, database, alias, message)
{
  var number = tryParseFloat( params );

  if ( !isNumber( number ) )
  {
    throw '"' + number + '" is not a valid number for the mod rule.';
  }

  return function(value, model, chain)
  {
    value = tryParseFloat( value );

    if ( isNumber( value ) )
    {
      chain.update( value % number );
    }

    chain.next();
  };
};

Validation.Rules.null = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    model.$set( field, null );

    chain.update( null );

    chain.next();
  };
};

Validation.Rules.round = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    value = tryParseFloat( value );

    if ( isNumber( value ) )
    {
      chain.update( Math.round( value ) );
    }

    chain.next();
  };
};

Validation.Rules.startOfDay = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    chain.update( startOfDay( value ) );

    chain.next();
  };
};

Validation.Rules.stripEnts = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    if ( isString( value ) )
    {
      chain.update( value.replace( /&[a-z]+;/gi, '' ) );
    }

    chain.next();
  };
};

Validation.Rules.stripTags = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    if ( isString( value ) )
    {
      chain.update( value.replace( /<(?:.|\n)*?>/gm, '' ) );
    }

    chain.next();
  };
};

Validation.Rules.trim = function(field, params, database, alias, message)
{
  var trim = (function()
  {
    if ( String.prototype.trim )
    {
      return function(x) {
        return x.trim();
      };
    }

    var regex = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;

    return function(x)
    {
      return x.replace( regex, '' );
    };

  })();

  return function(value, model, chain)
  {
    if ( isString( value ) )
    {
      chain.update( trim( value ) );
    }

    chain.next();
  };
};

Validation.Rules.unbase64 = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    if ( global.atob )
    {
      chain.update( global.atob( value ) );
    }

    chain.next();
  };
};


  Rekord.Validation = Validation;

  Rekord.ruleGenerator = ruleGenerator;
  Rekord.rangeRuleGenerator = rangeRuleGenerator;
  Rekord.collectionRuleGenerator = collectionRuleGenerator;
  Rekord.dateRuleGenerator = dateRuleGenerator;
  Rekord.fieldListRuleGenerator = fieldListRuleGenerator;
  Rekord.fieldsRuleGenerator = fieldsRuleGenerator;
  Rekord.foreignRuleGenerator = foreignRuleGenerator;
  Rekord.subRuleGenerator = subRuleGenerator;
  Rekord.listRuleGenerator = listRuleGenerator;
  Rekord.regexRuleGenerator = regexRuleGenerator;
  Rekord.sizeRuleGenerator = sizeRuleGenerator;

  Rekord.joinFriendly = joinFriendly;
  Rekord.tryParseFloat = tryParseFloat;
  Rekord.tryParseInt = tryParseInt;
  Rekord.startOfDay = startOfDay;
  Rekord.endOfDay = endOfDay;
  Rekord.determineMessage = determineMessage;
  Rekord.mapFromArray = mapFromArray;
  Rekord.checkNoParams = checkNoParams;
  Rekord.generateMessage = generateMessage;

  return Rekord;

}));
