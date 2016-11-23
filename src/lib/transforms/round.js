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
