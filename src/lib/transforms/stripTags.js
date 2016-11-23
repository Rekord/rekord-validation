Validation.Rules.stripTags = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    if ( isString( value ) )
    {
      chain.update( value.replace( /<(?:.|\n)*?>/gm, '' ) );
    }

    chain.next();
  };
};
