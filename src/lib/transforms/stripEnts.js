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
