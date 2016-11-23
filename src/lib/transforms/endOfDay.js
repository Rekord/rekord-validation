Validation.Rules.endOfDay = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    chain.update( endOfDay( value ) );
    
    chain.next();
  };
};
