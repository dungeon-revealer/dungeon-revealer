# Notes

## Dice Roll Notes

Below the chat textbox there is a button for toggeling the visibility of the the dice roll note window.
The notes can be used for writing down important stuff, but also declaring macros in [markdown](https://www.markdownguide.org/getting-started/).

The macros can be used for sending chat messages via the chat.

## Chat Message Macros

### Simple Macro

```md
<ChatMessage message="Attack with Axe [1d20] makes [2d6] Damage">
  Attack with Axe
</ChatMessage>
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

```markdown
<Template id="attackTemplate">
  <Box>
    <BoxRow>
      <span style="color:red;font-weight:bold">Attack with {weapon}</span>
    </BoxRow>
    <BoxRow>
      <BoxColumn>
        Attack Roll
      </BoxColumn>
      <BoxColumn>
        {attackRollFormula}
      </BoxColumn>
    </BoxRow>
    <BoxRow>
      <BoxColumn>
        Damage
      </BoxColumn>
      <BoxColumn>
        {damageRollFormula}
      </BoxColumn>
    </BoxRow>
  </Box>
</Template>

<ChatMessage templateId="attackTemplate" var-weapon="Handaxe" var-attackRollFormula="[1d20 + 5]" var-damageRollFormula="[1d6 + 6]">
  Attack with Handaxe
</ChatMessage>

<ChatMessage templateId="attackTemplate" var-weapon="Axe" var-attackRollFormula="[1d20 + 4]" var-damageRollFormula="[1d4 + 4]">
  Attack with Dagger
</ChatMessage>
```

A template can be declared by using the `Template` tag. Make sure to set a unique `id` attribute that can later be used for referencing the template.

Inside the template you can use the following html tags:

- div (Allowed attributes: `style`)
- span (Allowed attributes: `style`)

As well as the following custom components for structuring content:

- Box (Box with grey border and rounded corners)
- BoxRow (Horizontal row)
- BoxColumn (horizontal row column)

Variables can bes set by using the variable name surrounded by curly brackets `{myVariable}`.

The template can be used by setting the `templateId` attribute to the Template `id`. In addition variable values can be passed by setting them as attributes on the `ChatMessage` and prefixing them with `var-`.

E.g. the attribute for substituting the `myVariable` variable is `var-myVariable="My Custom Value"`.

This allows easily defining triggers for multiple skill checks or weapon attacks.

```markdown
<Template id="skillCheck">
  <div style="background-image:url('/api/images/04545c2f-6f7b-4fc6-a9d8-6d6580503031');background-position: 100% center;background-size:contain;background-repeat:no-repeat">
    <Box>
      <BoxRow>
        <BoxColumn>
        <div style="font-weight:bold;color:#B71C1C">{title}</div>
        </BoxCoumn>
        
      </BoxRow>
      <BoxRow>
        <BoxColumn>{attribute1}</BoxColumn>
        <BoxColumn>[1d20]</BoxColumn>
      </BoxRow>
      <BoxRow>
        <BoxColumn>{attribute2}</BoxColumn>
        <BoxColumn>[1d20]</BoxColumn>
      </BoxRow>
      <BoxRow>
        <BoxColumn>{attribute3}</BoxColumn>
        <BoxColumn>[1d20]</BoxColumn>
      </BoxRow>
    </Box>
  </div>
</Template>

<ChatMessage templateId="skillCheck" var-title="Schwimmen Probe" var-attribute1="Geschicklichkeit" var-attribute2="Konstitution" var-attribute3="Körperkraft">
 Schwimmen Probe
</ChatMessage>
```
