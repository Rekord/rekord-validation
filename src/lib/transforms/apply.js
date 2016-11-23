Validation.Rules.apply = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    model.$set( field, value );

    chain.next();
  };
};
