## Chat Message Macros

### Simple Macro

```hbs
<ChatMacro message="Attack with Axe [1d20] makes [2d6] Damage">
  Attack with Axe
</ChatMacro>
```

You can embed dice rolls by using a dice notation formula surrounded by square brackets. Besides using them in macros, you can also simply type dice rolls into the chat.

Examples of dice rolls:

- `[1d20]`
- `[3d6]`
- `[(1d4 + 1) * 3 ]`
- `[1d9000]`

When toggeling from the editor mode back into the rendered note mode the above macro will be rendered as a clickable button with the text `Attack with Axe`.
Click that button for sending the contents of the `message` attribute (`Attack with Axe [1d20] makes [2d6] Damage`) to the chat!

### Template Macro

For more complex templates it is encouraged to use a template. Templates can be declared once per note and re-used with different variables:

```hbs
<Template id="attackTemplate">
  <Box>
    <BoxRow>
      <span style="color:red;font-weight:bold">Attack with {{weapon}}</span>
    </BoxRow>
    <BoxRow>
      <BoxColumn>
        Attack Roll
      </BoxColumn>
      <BoxColumn>
        {{attackRollFormula}}
      </BoxColumn>
    </BoxRow>
    <BoxRow>
      <BoxColumn>
        Damage
      </BoxColumn>
      <BoxColumn>
        {{damageRollFormula}}
      </BoxColumn>
    </BoxRow>
  </Box>
</Template>

<ChatMacro
  templateId="attackTemplate"
  var-weapon="Handaxe"
  var-attackRollFormula="[1d20 + 5]"
  var-damageRollFormula="[1d6 + 6]"
>
  Attack with Handaxe
</ChatMacro>

<ChatMacro
  templateId="attackTemplate"
  var-weapon="Axe"
  var-attackRollFormula="[1d20 + 4]"
  var-damageRollFormula="[1d4 + 4]"
>
  Attack with Dagger
</ChatMacro>
```

A template can be declared by using the `Template` tag. Make sure to set a unique `id` attribute that can later be used for referencing the template.

Inside the template you can use the following html tags:

- div (Allowed attributes: `style`)
- span (Allowed attributes: `style`)

As well as the following custom components for structuring content:

- Box (Box with grey border and rounded corners)
- BoxRow (Horizontal row)
- BoxColumn (horizontal row column)

Variables can bes set by using the variable name surrounded by curly brackets `{{myVariable}}`.

The template can be used by setting the `templateId` attribute to the Template `id`. In addition variable values can be passed by setting them as attributes on the `ChatMacro` and prefixing them with `var-`.

E.g. the attribute for substituting the `myVariable` variable is `var-myVariable="My Custom Value"`.

This allows easily defining triggers for multiple skill checks or weapon attacks.

```jsx
<Template id="skillCheck">
  <div style="background-image:url('/api/images/04545c2f-6f7b-4fc6-a9d8-6d6580503031');background-position: 100% center;background-size:contain;background-repeat:no-repeat">
    <Box>
      <BoxRow>
        <BoxColumn>
        <div style="font-weight:bold;color:#B71C1C">{title}</div>
        </BoxCoumn>

      </BoxRow>
      <BoxRow>
        <BoxColumn>{{attribute1}}</BoxColumn>
        <BoxColumn>[1d20]</BoxColumn>
      </BoxRow>
      <BoxRow>
        <BoxColumn>{{attribute2}}</BoxColumn>
        <BoxColumn>[1d20]</BoxColumn>
      </BoxRow>
      <BoxRow>
        <BoxColumn>{{attribute3}}</BoxColumn>
        <BoxColumn>[1d20]</BoxColumn>
      </BoxRow>
    </Box>
  </div>
</Template>

<ChatMacro
  templateId="skillCheck"
  var-title="Swim Skill Check"
  var-attribute1="Dexterity"
  var-attribute2="Constitution"
  var-attribute3="Strength"
>
 Swim Skill Check
</ChatMacro>
```

### Advanced Template Macros

For complex calculations and conditional dice rolling we recommend using the [`Liquid`](https://shopify.github.io/liquid/) based template API.

This allows powerful features such as conditionals, variable declarations and mathematical operations.

#### Example Template

```jsx
<Template
  id="attackTemplate"
  var-score={{
    "type": "number",
    "label": "Ability Score1",
    "value": 17
  }}
  var-handicap={{
    "type": "number",
    "label": "Handicap",
    "value": 0,
    "min": -20,
    "max": 20
  }}
>
  {% assign attackRoll = "1d20" | diceRoll %}
  {% assign result = attackRoll.result | plus: vars.handicap %}
  <div style="color:red;font-weight:bold">Attack with {{weapon}}</div>
  <div>
    <span style="font-weight:bold">Attack Roll:</span>
    {% renderDiceRoll attackRoll %}
  </div>
  {% if attackRoll.result == 1 or attackRoll.result == 20 %}
    {% assign criticalHitRoll = "1d20" | diceRoll %}
    {% assign criticalResult = criticalHitRoll.result | plus: vars.handicap %}
    <div>
      <span style="font-weight:bold">Confirmation:</span>
      {% renderDiceRoll criticalHitRoll %}
    </div>
  {% endif %}
  {% if vars.handicap != 0 %}
   <div><span style="font-weight:bold">Handicap:</span> {{vars.handicap}}</div>
  {% endif %}
  <div>
  {% if criticalResult.result == 1 or criticalResult <= vars.score and attackRoll.result == 1 %}
    CRITICAL HIT!
  {% elsif criticalResult.result == 20 or criticalResult > vars.score and attackRoll.result == 20 %}
    CRITICAL MISS!
  {% elsif result <= vars.score %}
    Hits!
  {% else %}
    Misses!
  {% endif %}
</Template>
```

#### Dice rolls within templates

A dice roll can be assigned to a variable using the `diceRoll` filter.

The `diceRoll` filter is a custom filter built into dungeon-revealer.

Example: `{% assign attackRoll = "1d20" | diceRoll %}`

Withe the `renderDiceRoll` helper a previously assigned dice roll can be rendered within the template.

`{% renderDiceRoll attackRoll %}`

Only dice rolls can be rendered with that helper.

In addition the dice roll result can be accessed directly via `attackRoll.result`. This is handy for complex calculations.

#### Globals

The following globals are injected into the template and can be referenced within the logic:

```json5
{
 "context": {
   "authorName": "Hans"
 },
 /* Variables declared on the Template with var- prefix */
 "vars": {
   "value1": string | number | array | object,
   "value2": string | number | array | object,
   "...": string | number | array | object,
 }
}
```

The authorName can be embedded into the template via `{{context.authorName}}`.

#### Modifier Variables

It is possible to declare dynamic values that can be adjusted via a form mask for injecting modified variables into the template.

The attributes on the `Template` tag should be prefixed with `var-`.

The following types are currently supported:

##### `text`

```jsx
<Template
  id="template1"
  var-text={{
    "type": "text",
    "value": "I am the default value",
    "label": "Text"
  }}
>
 {{vars.text}}
</Template>
```

##### `text`

```jsx
<Template
  id="template1"
  var-text={{
    "type": "text",
    "value": "I am the default value",
    "label": "Text"
  }}
>
 {{vars.text}}
</Template>
```

##### `number`

```jsx
<Template
  id="template1"
  var-mod={{
    "type": "number",
    "value": 10,
    "step": 1,
    "min": -10,
    "max": 10,
    "label": "Mod"
  }}
>
  {% assign attackRoll = "1d20" | diceRoll %}
  {% assign sum = attackRoll.result | add: vars.mod %}
  {{sum}}
</Template>
```

##### `select`

```jsx
<Template
  id="template1"
  var-skill={{
    "type": "select",
    "label": "Skills",
    "options": [
      {
        "label": "Fly",
        "value": {
          "score": 0,
          "motivation": "I believe I can fly"
        }
      },
      {
        "label": "Cry",
        "value": {
          "score": 0,
          "motivation": "I believe I can cry"
        }
      }
    ]
  }}
>
  {{vars.skill.value.score}}
  {{vars.skill.value.motivation}}
</Template>
```

##### Complex example

```jsx
<Template
  id="skillCheck"
  var-skill={{"type":"select","label":"Skills","options":[{"label":"Fliegen","value":{"score":0,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Intuition","value":11},"attr3":{"name":"Gewandheit","value":13}}},{"label":"Gaukeleien","value":{"score":10,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Charisma","value":12},"attr3":{"name":"Fingerfertigkeit","value":13}}},{"label":"Klettern","value":{"score":9,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Gewandheit","value":13},"attr3":{"name":"Körperkraft","value":16}}},{"label":"Körperbeherrschung","value":{"score":10,"attr1":{"name":"Gewandheit","value":13},"attr2":{"name":"Gewandheit","value":13},"attr3":{"name":"Konstitution","value":14}}},{"label":"Kraftakt","value":{"score":10,"attr1":{"name":"Konstitution","value":14},"attr2":{"name":"Körperkraft","value":16},"attr3":{"name":"Körperkraft","value":16}}},{"label":"Reiten","value":{"score":10,"attr1":{"name":"Charisma","value":12},"attr2":{"name":"Gewandheit","value":13},"attr3":{"name":"Körperkraft","value":16}}},{"label":"Schwimmen","value":{"score":7,"attr1":{"name":"Gewandheit","value":13},"attr2":{"name":"Konstitution","value":14},"attr3":{"name":"Körperkraft","value":16}}},{"label":"Selbstbeherrschung","value":{"score":3,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Mut","value":16},"attr3":{"name":"Konstitution","value":14}}},{"label":"Singen","value":{"score":10,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Charisma","value":12},"attr3":{"name":"Konstitution","value":14}}},{"label":"Sinnesschärfe","value":{"score":7,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Intuition","value":11},"attr3":{"name":"Intuition","value":11}}},{"label":"Tanzen","value":{"score":0,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Charisma","value":12},"attr3":{"name":"Gewandheit","value":13}}},{"label":"Taschendiebstahl","value":{"score":0,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Fingerfertigkeit","value":13},"attr3":{"name":"Gewandheit","value":13}}},{"label":"Verbergen","value":{"score":4,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Intuition","value":11},"attr3":{"name":"Gewandheit","value":13}}},{"label":"Zechen","value":{"score":10,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Konstitution","value":14},"attr3":{"name":"Körperkraft","value":16}}},{"label":"Bekehren & Überzeugen","value":{"score":0,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Charisma","value":12}}},{"label":"Betören","value":{"score":3,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Charisma","value":12},"attr3":{"name":"Charisma","value":12}}},{"label":"Einschüchtern","value":{"score":7,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Intuition","value":11},"attr3":{"name":"Charisma","value":12}}},{"label":"Etikette","value":{"score":0,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Intuition","value":11},"attr3":{"name":"Charisma","value":12}}},{"label":"Gassenwissen","value":{"score":0,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Intuition","value":11},"attr3":{"name":"Charisma","value":12}}},{"label":"Menschenkenntnis","value":{"score":1,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Intuition","value":11},"attr3":{"name":"Charisma","value":12}}},{"label":"Überreden","value":{"score":2,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Intuition","value":11},"attr3":{"name":"Charisma","value":12}}},{"label":"Verkleiden","value":{"score":0,"attr1":{"name":"Intuition","value":11},"attr2":{"name":"Charisma","value":12},"attr3":{"name":"Gewandheit","value":13}}},{"label":"Willenskraft","value":{"score":3,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Intuition","value":11},"attr3":{"name":"Charisma","value":12}}},{"label":"Fährtensuchen","value":{"score":3,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Intuition","value":11},"attr3":{"name":"Gewandheit","value":13}}},{"label":"Fesseln","value":{"score":0,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Fingerfertigkeit","value":13},"attr3":{"name":"Körperkraft","value":16}}},{"label":"Fischen & Angeln","value":{"score":4,"attr1":{"name":"Fingerfertigkeit","value":13},"attr2":{"name":"Gewandheit","value":13},"attr3":{"name":"Konstitution","value":14}}},{"label":"Orientierung","value":{"score":7,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Intuition","value":11},"attr3":{"name":"Intuition","value":11}}},{"label":"Pflanzenkunde","value":{"score":10,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Fingerfertigkeit","value":13},"attr3":{"name":"Konstitution","value":14}}},{"label":"Tierkunde","value":{"score":5,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Mut","value":16},"attr3":{"name":"Charisma","value":12}}},{"label":"Wildnisleben","value":{"score":10,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Gewandheit","value":13},"attr3":{"name":"Konstitution","value":14}}},{"label":"Brett- & Glücksspiel","value":{"score":10,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Intuition","value":11}}},{"label":"Geographie","value":{"score":0,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Intuition","value":11}}},{"label":"Geschichtswissen","value":{"score":0,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Intuition","value":11}}},{"label":"Götter & Kulte","value":{"score":3,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Intuition","value":11}}},{"label":"Kriegskunst","value":{"score":0,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Intuition","value":11}}},{"label":"Magiekunde","value":{"score":0,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Intuition","value":11}}},{"label":"Mechanik","value":{"score":0,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Fingerfertigkeit","value":13}}},{"label":"Rechnen","value":{"score":1,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Intuition","value":11}}},{"label":"Rechtskunde","value":{"score":0,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Intuition","value":11}}},{"label":"Sagen & Legenden","value":{"score":5,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Intuition","value":11}}},{"label":"Sphärenkunde","value":{"score":0,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Intuition","value":11}}},{"label":"Sternkunde","value":{"score":0,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Intuition","value":11}}},{"label":"Alchimie","value":{"score":0,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Fingerfertigkeit","value":13}}},{"label":"Boote & Schiffe","value":{"score":3,"attr1":{"name":"Fingerfertigkeit","value":13},"attr2":{"name":"Gewandheit","value":13},"attr3":{"name":"Körperkraft","value":16}}},{"label":"Fahrzeuge","value":{"score":5,"attr1":{"name":"Charisma","value":12},"attr2":{"name":"Fingerfertigkeit","value":13},"attr3":{"name":"Konstitution","value":14}}},{"label":"Handel","value":{"score":5,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Intuition","value":11},"attr3":{"name":"Charisma","value":12}}},{"label":"Heilkunde Gift","value":{"score":0,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Klugheit","value":10},"attr3":{"name":"Intuition","value":11}}},{"label":"Heilkunde Krankheiten","value":{"score":0,"attr1":{"name":"Mut","value":16},"attr2":{"name":"Intuition","value":11},"attr3":{"name":"Konstitution","value":14}}},{"label":"Heilkunde Seele","value":{"score":0,"attr1":{"name":"Intuition","value":11},"attr2":{"name":"Charisma","value":12},"attr3":{"name":"Konstitution","value":14}}},{"label":"Heilkunde Wunden","value":{"score":3,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Fingerfertigkeit","value":13},"attr3":{"name":"Fingerfertigkeit","value":13}}},{"label":"Holzbearbeitung","value":{"score":10,"attr1":{"name":"Fingerfertigkeit","value":13},"attr2":{"name":"Gewandheit","value":13},"attr3":{"name":"Körperkraft","value":16}}},{"label":"Lebensmittelbearbeitung","value":{"score":5,"attr1":{"name":"Intuition","value":11},"attr2":{"name":"Fingerfertigkeit","value":13},"attr3":{"name":"Fingerfertigkeit","value":13}}},{"label":"Lederbearbeitung","value":{"score":5,"attr1":{"name":"Fingerfertigkeit","value":13},"attr2":{"name":"Gewandheit","value":13},"attr3":{"name":"Konstitution","value":14}}},{"label":"Malen & Zeichnen","value":{"score":5,"attr1":{"name":"Intuition","value":11},"attr2":{"name":"Fingerfertigkeit","value":13},"attr3":{"name":"Fingerfertigkeit","value":13}}},{"label":"Metallbearbeitung","value":{"score":0,"attr1":{"name":"Fingerfertigkeit","value":13},"attr2":{"name":"Konstitution","value":14},"attr3":{"name":"Körperkraft","value":16}}},{"label":"Musizieren","value":{"score":0,"attr1":{"name":"Charisma","value":12},"attr2":{"name":"Fingerfertigkeit","value":13},"attr3":{"name":"Konstitution","value":14}}},{"label":"Schlösserknacken","value":{"score":0,"attr1":{"name":"Intuition","value":11},"attr2":{"name":"Fingerfertigkeit","value":13},"attr3":{"name":"Fingerfertigkeit","value":13}}},{"label":"Steinbearbeitung","value":{"score":3,"attr1":{"name":"Fingerfertigkeit","value":13},"attr2":{"name":"Fingerfertigkeit","value":13},"attr3":{"name":"Körperkraft","value":16}}},{"label":"Stoffbearbeitung","value":{"score":5,"attr1":{"name":"Klugheit","value":10},"attr2":{"name":"Fingerfertigkeit","value":13},"attr3":{"name":"Fingerfertigkeit","value":13}}}]}}
  var-handicap={{
    "type": "number",
    "label": "Erschwernis",
    "value": 0,
    "min": -20,
    "max": 20,
    "step": 1
  }}
  >

  {% assign skillScore = vars.skill.value.score %}
  {% assign attr1Roll = "1d20" | diceRoll %}
  {% assign attr2Roll = "1d20" | diceRoll %}
  {% assign attr3Roll = "1d20" | diceRoll %}
  {% assign attr1Score = vars.skill.value.attr1.value %}
  {% assign attr2Score = vars.skill.value.attr2.value %}
  {% assign attr3Score = vars.skill.value.attr3.value %}
  {% assign attr1Mod = attr1Score | minus: attr1Roll.result | at_most: 0 %}
  {% assign attr2Mod = attr2Score | minus: attr2Roll.result | at_most: 0 %}
  {% assign attr3Mod = attr3Score | minus: attr3Roll.result | at_most: 0 %}
  {% assign sum = skillScore | plus: attr1Mod | plus: attr2Mod | plus: attr3Mod %}

  <span style="font-weight:bold;color:red">{{vars.skill.label}} Probe.</span> (Wert: {{skillScore}})

  <div>
   <span style="font-weight:bold">{{vars.skill.value.attr1.name}}:</span>
   {% renderDiceRoll attr1Roll %} (Wert: {{attr1Score}})
  </div>
  <div>
    <span style="font-weight:bold">{{vars.skill.value.attr2.name}}:</span>
    {% renderDiceRoll attr2Roll %} (Wert: {{attr2Score}})
  </div>
  <div>
   <span style="font-weight:bold">{{vars.skill.value.attr3.name}}:</span>
   {% renderDiceRoll attr3Roll %} (Wert: {{attr3Score}})
  </div>

  {% if sum >= 16 %}
    QS 6
  {% elsif sum >= 13 %}
    QS 5
  {% elsif sum >= 10 %}
    QS 4
  {% elsif sum >= 7 %}
    QS 3
  {% elsif sum >= 2 %}
    QS 2
  {% elsif sum >= 0 %}
    QS 1
  {% else %}
    Nicht geschafft (um {{ sum | abs }})
  {% endif %}
</Template>
<ChatMacro
  templateId="skillCheck"
>
  Talent Probe
</ChatMacro>
```
