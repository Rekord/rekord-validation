Validation.Rules.startOfDay = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    chain.update( startOfDay( value ) );

    chain.next();
  };
};
