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
