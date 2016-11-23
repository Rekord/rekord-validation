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
