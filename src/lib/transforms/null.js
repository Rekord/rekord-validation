Validation.Rules.null = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    model.$set( field, null );

    chain.update( null );

    chain.next();
  };
};
