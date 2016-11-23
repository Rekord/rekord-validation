Validation.Rules.trim = function(field, params, database, alias, message)
{
  var trim = (function()
  {
    if ( String.prototype.trim )
    {
      return function(x) {
        return x.trim();
      };
    }

    var regex = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;

    return function(x)
    {
      return x.replace( regex, '' );
    };

  })();

  return function(value, model, chain)
  {
    if ( isString( value ) )
    {
      chain.update( trim( value ) );
    }

    chain.next();
  };
};
