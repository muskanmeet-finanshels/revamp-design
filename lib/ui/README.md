# @muskanmeet/finanshels-ui

Finanshels UI component library — built with React, Tailwind CSS, and Radix UI primitives.

Includes: Button, Input, Textarea, Table, Dialog, Drawer fields, Dropdown, Select, Tabs, Tooltip, Avatar, Badge, Checkbox, Switch, Skeleton, Popover, Sonner (toast), and more.

---

## Installation

```bash
npm install @muskanmeet/finanshels-ui
# or
pnpm add @muskanmeet/finanshels-ui
```

---

## Setup

**1. Add to your Tailwind config** so the component class names are picked up:

```js
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@muskanmeet/finanshels-ui/dist/**/*.{js,mjs}',
  ],
  // ...
};
```

**2. Add the brand colour** the components reference (optional — only needed for orange accents):

```css
/* globals.css */
:root {
  --brand: 24 95% 53%;       /* HSL for the orange brand colour */
  --brand-hover: 24 95% 46%;
}
```

---

## Usage

```tsx
import { Button, Input, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@muskanmeet/finanshels-ui';

export default function Demo() {
  return (
    <div>
      <Input placeholder="Search..." />
      <Button>Save</Button>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Task 1</TableCell>
            <TableCell>Done</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## Components

| Component | Description |
|---|---|
| `Button` | Brand-styled button with variants |
| `Input` | Styled text input |
| `Textarea` | Multi-line input |
| `Table` / `TableHeader` / `TableBody` / `TableRow` / `TableHead` / `TableCell` | Data table primitives |
| `Dialog` / `DialogContent` / `DialogHeader` / `DialogTitle` / `DialogDescription` / `DialogFooter` | Modal dialog |
| `DrawerField` / `DrawerInput` / `DrawerTextarea` | Side-drawer form field wrappers |
| `DropdownMenu` | Radix dropdown with styled items |
| `Select` | Styled select / combobox |
| `Tabs` | Tab navigation |
| `Tooltip` | Accessible tooltip |
| `Avatar` | User avatar with fallback initials |
| `Badge` | Status / label badge |
| `Checkbox` | Accessible checkbox |
| `Switch` | Toggle switch |
| `Skeleton` | Loading placeholder |
| `Popover` | Floating popover |
| `Toaster` | Sonner toast provider |
| `Empty` | Empty-state illustration block |
| `cn` | `clsx` + `tailwind-merge` utility |

---

## License

MIT
