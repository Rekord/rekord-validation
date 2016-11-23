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
