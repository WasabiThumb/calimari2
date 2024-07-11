# Calimari
The lean-ient number range & set parser, now in TypeScript.
No dependencies, no fuss.

[Usage](#usage) &bull; [Features](#features) &bull; [Configuration](#configuration) &bull; [Source Code](https://github.com/WasabiThumb/calimari2)

## Usage
```js
// es6
import calimari from "calimari";
// commonjs
const calimari = require("calimari");

calimari("5-7, 9 || -5-6");
/*
[
    [5, 6, 7, 9],
    [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]
]
*/

calimari("12, 15, 17-20 ^ 18", { allGroups: false });
/* [12, 15, 17, 19, 20] */

calimari("1-3 \n 4-6 \n 7-9", { groupSeparator: '\n' });
/*
[
    [ 1, 2, 3 ],
    [ 4, 5, 6 ],
    [ 7, 8, 9 ]
]
*/

calimari("(5 - 10, 11, 12, 13) ^ (8-11)");
/* [ [ 5, 6, 7, 12, 13 ] ] */

calimari("1, 2, 3, (4 - 5", { minValue: 2 });
/*
[
  [ 2, 3, 4, 5 ],
  errors: [
    {
      type: 3,
      group: 0,
      location: 1,
      message: 'Value 1 is less than min bound 2'
    },
    {
      type: 2,
      group: 0,
      location: 15,
      message: 'Expected ending closure symbol'
    }
  ]
]
*/
```

## Features

### Ranges
The dash ``-`` is considered the "range" operator since it expects a number
before & after between which to create a range. Once a range is created,
each integer between the low and high bound becomes part of the output group.

### Unions
The comma ``,`` is considered the "union" operator since it joins together
numbers, ranges and enclosures. If two numbers are separated by whitespace
with no union operator, a union operator is inferred and an [error](#errors)
is generated.

### Groups
The double pipe ``||`` is the default "group separator" (can be overrided in the [config](#configuration)).
Each group will be returned as a separate array in the output 2D array, or if
``allGroups`` is set to false, each group is unionised to
create the output 1D array.

### Closures
The open & closing parenthesis ``()`` are the opening and closing closure operators
respectively. Within a closure, the state of the parser is reset. Each closure is evaluated seperately,
and then either added or subtracted to eachother depending on the state of the parser (see [Difference](#difference)).

### Difference
The ``^`` is considered the "difference" operator. It works like the [union](#union) operator,
except where ``C = A ^ B``, ``C`` contains all values that are contained within ``A``
but **not** ``B``.

### Errors
The result will have the ``errors`` property set to an array of error objects
if at least 1 error was encountered during parsing. All errors can be safely ignored.
If an error is generated, parsing will not halt unless ``strict`` is set in the [config](#configuration).
The errors object is structured as follows:

| Property | Type       | Description                                                                                |
| --:      | :-:        | :--                                                                                        |
| type     | ``number`` | A number corresponding to the internal type of the error. See [Error Types](#error-types). |
| group    | ``number`` | The group that was being processed when the error was generated.                           |
| location | ``number`` | The location within the group string where the error was generated.                        |
| message  | ``string`` | Message describing the problem.                                                            |

#### Error Types
| Type Code | Type Name  | Description                                                                              |
| --:       | :-:        | :--                                                                                      |
| 0         | OK         | No error.                                                                                |
| 1         | BAD_CONFIG | The [configuration](#configuration) given to the parser is malformed.                    |
| 2         | BAD_FORMAT | The input to the parser is inconsistent; e.g. a closure was opened without being closed. |
| 3         | BAD_VALUE  | The parser expected a number, but the number was malformed or unacceptable.              |
| 4         | BAD_SYMBOL | The parser expected a symbol (e.g. ``-,^()``) but received a non-symbol.                 |

## Configuration
All config keys are optional. If a configuration option with no default is left unset, its associated behavior is disabled.
| Key            | Type                     | Description                                                                          |
| --:            | :-:                      | :--                                                                                  |
| allGroups      | ``boolean``              | If set to false, Calimari will return a 1D array containing the union of all groups. |
| strict         | ``boolean``              | If set to true, Calimari will throw an error if any [errors](#errors) were generated.|
| groupSeparator | ``string`` \| ``RegExp`` | The pattern that divides groups. Default is ``\|\|``.                                |
| minValue       | ``number``               | Enforces that all numbers are greater than or equal to this.                         |
| maxValue       | ``number``               | Enforces that all numbers are less than or equal to this.                            |
| onlyWhole      | ``boolean``              | If set to true, only whole numbers (integers) are allowed.                           |

## License
```text
   Copyright 2024 Wasabi Codes

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```