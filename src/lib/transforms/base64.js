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
