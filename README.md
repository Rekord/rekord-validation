# <img src="https://raw.githubusercontent.com/Rekord/rekord/master/images/rekord-color.png" width="60"> Rekord Validation

[![Build Status](https://travis-ci.org/Rekord/rekord-validation.svg?branch=master)](https://travis-ci.org/Rekord/rekord-validation)
[![devDependency Status](https://david-dm.org/Rekord/rekord-validation/dev-status.svg)](https://david-dm.org/Rekord/rekord-validation#info=devDependencies)
[![Dependency Status](https://david-dm.org/Rekord/rekord-validation.svg)](https://david-dm.org/Rekord/rekord-validation)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Rekord/rekord-validation/blob/master/LICENSE)
[![Alpha](https://img.shields.io/badge/State-Alpha-orange.svg)]()

Rekord is a javascript REST ORM that is offline and real-time capable.

rekord-validation adds rules, expressions, transforms, and custom validation functionality.

**Installation**

The easiest way to install rekord-validation is through bower via `bower install rekord-validation`.

- rekord-validation.js is `48KB` (`8.32KB` gzipped)
- rekord-validation.min.js is `19KB` (`5.69KB` gzipped)

### Example

```javascript
// Simplest rule definition
var Task = Rekord({
  name: 'task',
  fields: ['name', 'details', 'done', 'done_at'],
  validation: {
    rules: {
      name: 'required|alpha_dash',
      details: '$custom', // custom function
      done: 'yesno',
      done_at: 'if:done:accepted|required|date_like'
    },
    required: true // the rules must pass to $save model instances
  },
  methods: {
    $custom: function(value, getAlias, specifiedMessage, chain) {
      if ( value.length > 140 ) {
        return 'Details can be no larger than 140 characters.'
      }
    }
  }
});

var t0 = new Task({name: '^', done: true, details: '0...141'});
t0.$save();
t0.$valid; // false
t0.$validationMessages; // array of below messages
t0.$validations; /* {
  name: 'name should only contain alpha-numeric characters, dashes, and underscores.',
  details: 'Details can be no larger than 140 characters.',
  done_at: 'done_at is required.'
} */

// You can use aliases to make messages friendlier
var Task = Rekord({
  name: 'task',
  fields: ['name', 'done', 'done_at'],
  validation: {
    rules: {
      name: 'required|alpha_dash',
      done: 'yesno',
      done_at: 'if:done:accepted|required|date_like'
    },
    aliases: {
      name: 'Task name',
      done: 'Task completed',
      done_at: 'Task completed at'
    }
  }
});

var t1 = new Task({name: '', done: false});
t1.$validate(); /* {
  name: 'Task name is required.'
} */

var t2 = new Task({name: 'task2', done: true, done_at: 'not date'});
t2.$validate(); /* {
  done_at: 'Task completed at must be a valid date.'
} */

// You can specify field level custom messages
var Task = Rekord({
  name: 'task',
  fields: ['name', 'done', 'done_at'],
  validation: {
    rules: {
      name: 'required|alpha_dash',
      done: 'yesno',
      done_at: 'if:done:accepted|required|date_like'
    },
    messages: {
      name: 'Task name is required and must be alpha-numeric and can contain dashes and hyphens.',
      done_at: 'When a task is completed, the completed date is required.'
    }
  }
});

var t3 = new Task({name: '?', done: true, done_at: 'not date'});
t3.$validate(); /* {
  name: 'Task name is required and must be alpha-numeric and can contain dashes and hyphens.',
  done_at: 'When a task is completed, the completed date is required.'
} */

// You can specify rule level custom messages
var Task = Rekord({
  name: 'task',
  fields: ['name', 'done', 'done_at'],
  validation: {
    rules: {
      name: {
        'required': false, // defaults to field level - then default
        'alpha_dash': 'Task name must be alpha-numeric and can contain dashes and hyphens.'
      },
      done: 'yesno',
      done_at: {
        'if:done:accepted': false, // defaults to field level - then default
        'required': 'Task completed date is required when the task is complete.',
        'date_like': 'Task completed date must be a valid date when the task is complete.'
      }
    },
    aliases: {
      name: 'Task name'
    }
  }
});

var t4 = new Task({name: '?', done: true, done_at: 'not date'});
t4.$validate(); /* {
  name: 'Task name must be alpha-numeric and can contain dashes and hyphens.',
  done_at: 'Task completed date must be a valid date when the task is complete.'
} */

var t5 = new Task({done: true});
t5.$validate(); /* {
  name: 'Task name is required.',
  done_at: 'Task completed date is required when the task is complete.'
} */

// There are even more specific ways to define rules - depending on the rule.
// Check out the tests!

```

### Concepts

- "date like": number (millis since Unix Epoch), Date object, or string that can be parsed with `Date.parse`
- "number like": number or a string that begins with a number

### Rules

#### Simple
- `accepted`: The field must be an accepted value (1, yes, on, y, or true)
- `after:date`: If the field is like a date, it must be after the given `date` expression
- `after_on:date`: If the field is like a date, it must be on or after the given `date` expression
- `before:date`: If the field is like a date, it must be before the given `date` expression
- `before_on:date`: If the field is like a date, it must be on or before the given `date` expression
- `date_like`: The field must look like a date (Date, number, or valid date string)
- `required_if:field,value0,valueN`: The field is required is another `field` has any of the given values
- `required_unless:field,value0,valueN`: The field is required if another `field` does not have any of the given values
- `confirmed:field`: The field must match another `field`
- `different:field`: The field must NOT match another `field`
- `if_valid:field0,fieldN`: The rules following this one for this field will not be executed if any of the `field`s are invalid at this point in time in validation
- `required_with:field0,fieldN`: The field is required if any of the `field`s have a non-empty value
- `required_with_all:field0,fieldN`: The field is required if all of the `field`s have a non-empty value
- `required_without:field0,fieldN`: The field is required if any of the `field`s have an empty value
- `required_without_all:field0,fieldN`: The field is required if all of the `field`s have an empty value
- `exists` `exists:models` `exists:models,field`: The field value must exist in the given database (`models` - or this if none specified) in the given `field` (this field if not given)
- `unique` `unique:models` `unique:models,field`: The field value must NOT exist in the given database (`models` - or this if none specified) in the given `field` (this field if not given)
- `if:rule0\|ruleN`: The rules following this one for this field will not be executed unless all `rule`s pass
- `if_any:rule0\|ruleN`: The rules following this one for this field will not be executed unless at lease one `rule` passes
- `if_not:rule0\|ruleN`: The rules following this one for this field will only be executed if all `rule`s fail
- `in:value0,valueN`: This field must have a value in the given `value`s
- `not_in:value0,valueN`: This field must NOT have a value in the given `value`s
- `between:start,end`: This field must have a size between (inclusive) the `start` and `end` (string, number, array, or object)
- `not_between:start,end`: This field must NOT have a size between (inclusive) the `start` and `end` (works with strings, numbers, arrays, object keys)
- `alpha`: The field should only contain alphabetic characters
- `alpha_dash`: The field should only contain alpha-numeric characters, dashes, and underscores
- `alpha_num`: The field should only contain alpha-numeric characters
- `email`: The field should look like an email
- `url`: The field should look like a URL
- `uri`: The field should look like a URI
- `phone`: The field should look like a phone number
- `regex:/rgx/`: The field should pass the regular expression
- `required`: The field must be a non-empty value
- `min:number`: The field must be at least `number` in size (string, number, array, or object)
- `greater_than:number`: The field must be greater than `number` in size (string, number, array, or object)
- `max:number`: The field must be no more than `number` in size (string, number, array, or object)
- `less_than:number`: The field must be less than `number` in size (string, number, array, or object)
- `equal:number`: The field must be equal to `number` in size (string, number, array, or object)
- `not_equal:number`: The field must not be equal to `number` in size (string, number, array, or object)
- `array`: The field must be an instance of Array
- `object`: The field must be an object (arrays count as objects)
- `string`: The field must be a string
- `number`: The field must be a number
- `boolean`: The field must be a boolean
- `model`: The field must be a model instance
- `whole`: The field must look like a whole number
- `numeric`: The field must look like a number
- `yesno`: The field must look like a boolean (true, t, yes, y, 1, false, f, no, n, 0)

#### Relationship
- `contains:field,value`: The relation field must contain a model with at least one `field` matching the given `value`
- `not_contains:field,value`: The relation field must NOT contain a model with at least one `field` matching the given `value`
- `validate`: The relation field must contain all valid models

### Expressions
Expressions can be passed to rules (like date rules) and are generated on validation

- `MM/dd/yyyy`: Parses to a date time
- `field`: Takes a field value from the model being validated
- `-1 day`: Relative amount of time from current time (+-)N (ms,s,min,hr,day,month,wk,yr)
- `today`: Todays date (start of day)
- `tomorrow`: Tomorrows date (start of day)
- `yesterday`: Yesterdays date (start of day)

### Transforms
Transforms modify the value being validated so all subsequent rules use the modified values. Some transforms can apply the modified value back to the model after validation.

- `trim`: If the field value is a string, return the trimmed value
- `abs`: If the field value looks like a number, parse it and return the absolute value
- `ceil`: If the field value looks like a number, parse it and return the ceiling value
- `floor`: If the field value looks like a number, parse it and return the floored value
- `round`: If the field value looks like a number, parse it and return the rounded value
- `endOfDay`: If the field value looks like a date, return its end of day
- `startOfDay`: If the field value looks like a date, return its start of day
- `base64`: Base64 encode the current value
- `unbase64`: Un-base64 the current value
- `filter`: If the field value is an array or object, remove the null and undefined properties/elements
- `mod:number`: If the field value looks like a number, parse it and return the remainder to the division between the field value and `number`

- `null`: Apply null back to the model (can be used in conjuction with `if`)
- `apply`: Apply the currently transformed value back to the model
