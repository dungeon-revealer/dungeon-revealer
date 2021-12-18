Notes are documents that the user can put in dungeon-revealer. Click the `Notes` button at the bottom to view the notes library. You can view existing notes or create new ones from the library.

## Creating Notes

Click the `Create New Note` button in the notes library to make a new note.

![note-library](https://user-images.githubusercontent.com/9096667/87478741-e51d9c00-c5ef-11ea-867f-348e195b71d6.png)

Notes are written in the popular [markdown syntax](https://guides.github.com/features/mastering-markdown/). There are buttons that input the syntax for common tasks: **bold**, _italics_, lists, images, and links. You can also set the permissions of the note to admin, which is only visible to the DM, or public, which is visible to everyone.

Notes can be used in many ways. You can save creature/player stats, room descriptions, or even system rules so you can quickly reference them.

### Custom CSS within Notes

It is possible to declare and use CSS styles within notes. CSS styles can be declared by using the html `style` tag.

```html
<style>
  .red {
    color: red;
  }
</style>

My markdown file content. It can be <span class="red">red</span>.
```

The CSS styles are scoped to the note they are declared in. It is only possible to use a subset of all available CSS rules.

Here is a complete list of all supported rules:

`display`, `background-color`, `padding`, `padding-left`, `padding-right`, `padding-top`, `padding-bottom`, `margin`, `margin-left`, `margin-right`, `margin-bottom`, `margin-top`, `height`, `width`, `max-width`, `min-width`, `max-height`, `min-height`, `border`, `border-left`, `border-right`, `border-top`, `border-bottom`, `color`, `font-size`, `font-family`, `text-align`, `line-height`, `font-style`, `font-weight`,` text-transform`, `text-decoration`, `text-shadow`, `color`, `flex`, `flex-basis`, `flex-direction`, `flex-flow`, `flex-grow`, `flex-shrink`, `flex-wrap`, `order`, `justify-content`, `align-items`, `align-self`, `align-content`

In case there is one missing, please feel free to reach out to us for adding it, either by creating a GitHub issue or via Discord.

## Searching Notes

On the main page, click on the search icon in the top right corner. A search box will pop up and you can search for any term. Players can also search through any notes with public permissions.

![search](https://user-images.githubusercontent.com/9096667/87480101-4181bb00-c5f2-11ea-95f1-34a13e3c75f2.png)

Click on a note from the list to open a box with the full note. There are buttons at the top that let you quickly edit, change permissions, or share the note. Sharing the note sends the note to the chat.

![note](https://user-images.githubusercontent.com/9096667/87480109-434b7e80-c5f2-11ea-9d78-0e51fadf2196.png)

## Importing Notes

As the admin it is possible to import markdown files into dungeon-revealer.
You can either drag & drop a `.zip` archive containing markdown files or a single markdown file into the dungeon-master section for starting an import.

The files must follow this format convention:

```md
---
id: unique-id
title: The title of the note
is_entry_point: true
---

This is the text of the note. It can contain any type of markdown. Such as **bold text** or [links](http://google.de).
```

The markdown files **MUST** start with a header constrained by `---`.
Each line represents a value:

- **`id`**. A global unique id for all notes. When importing a lot files it is recommended to prefix them with something like `collection-1-` to avoid clashes with other notes.
- **`title`**. The title of the note.
- **`is_entry_point`**. Either `true` or `false` depending on whether the note should pop-up in the notes library as an entry point or not.
