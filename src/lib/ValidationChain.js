
function ValidationChain(model, field, validations, onEnd)
{
  this.model = model;
  this.field = field;
  this.validations = validations;
  this.onEnd = onEnd;
}

Class.create( ValidationChain,
{

  reset: function(value)
  {
    this.value = value !== undefined ? value : this.model.$get( this.field );
    this.updated = false;
    this.valid = true;
    this.message = '';
    this.linkIndex = 0;
  },

  start: function(value)
  {
    this.reset( value );
    this.call();
  },

  call: function()
  {
    this.validations[ this.linkIndex ]( this.value, this.model, this );
  },

  update: function(newValue)
  {
    this.value = newValue;
    this.updated = true;

    return this;
  },

  next: function()
  {
    var n = this.validations.length;

    this.linkIndex++;

    if (this.linkIndex === n)
    {
      this.onEnd( this );
    }
    else if (this.linkIndex < n)
    {
      this.call();
    }

    return this;
  },

  stop: function()
  {
    var n = this.validations.length;

    if (this.linkIndex < n)
    {
      this.linkIndex = n - 1;
      this.next();
    }

    return this;
  },

  invalid: function(message)
  {
    this.message = message;
    this.valid = false;
    this.stop();

    return this;
  }

});
