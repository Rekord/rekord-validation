// accepted
Validation.Rules.accepted = function(field, params, database, getAlias, message)
{
  checkNoParams( 'accepted', field, params );

  var messageTemplate = determineMessage( 'accepted', message );
  var acceptable = Validation.Rules.accepted.acceptable;

  return function(value, model, chain)
  {
    var valueString = (value + '').toLowerCase();
    var accepted = acceptable[ valueString ];

    if ( !accepted )
    {
      chain.invalid( generateMessage( field, getAlias( field ), value, model, messageTemplate ) );
    }
    else
    {
      chain.next();
    }
  };
};

Validation.Rules.accepted.message = '{$alias} has not been accepted.';

Validation.Rules.accepted.acceptable =
{
  '1':    true,
  'yes':  true,
  'on':   true,
  'y':    true,
  'true': true
};
