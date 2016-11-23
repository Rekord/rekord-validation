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
