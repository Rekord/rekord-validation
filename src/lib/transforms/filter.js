Validation.Rules.filter = function(field, params, database, alias, message)
{
  return function(value, model, chain)
  {
    if ( isArray( value ) )
    {
      for (var i = value.length - 1; i >= 0; i--)
      {
        if ( !isValue( value[ i ] ) )
        {
          value.splice( i, 1 );
        }
      }

      chain.update( value );
    }
    else if ( isObject( value ) )
    {
      for (var prop in value)
      {
        if ( !isValue( value[ prop ] ) )
        {
          delete value[ prop ];
        }
      }

      chain.update( value );
    }

    chain.next();
  };
};
