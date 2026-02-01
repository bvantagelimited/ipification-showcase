# Locale Configuration

This document explains how to configure and override locale strings (text labels) in the IPification Showcase application.

## Table of Contents

- [Overview](#overview)
- [Locale File Structure](#locale-file-structure)
- [Default Locale File](#default-locale-file)
- [Overriding Locale Strings](#overriding-locale-strings)
- [Deep Merging Behavior](#deep-merging-behavior)
- [Using Locale in Views](#using-locale-in-views)
- [Locale Structure Reference](#locale-structure-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Implementation Details](#implementation-details)
- [Related Documentation](#related-documentation)
- [Examples](#examples)

---

## Overview

The application uses a locale system that allows you to customize all text labels displayed in the user interface. Locale strings are stored in `config/locale.json` and can be overridden in `config/default.json` for environment-specific customizations. For config field details, see [Sample Config Reference](CONFIG_DEFAULT_JSON_SAMPLE.md).

---

## Locale File Structure

The locale system is organized into logical sections:

```json
{
  "app": {
    "name": "Application name displayed in header"
  },
  "tabs": {
    "pnv": "PNV tab label",
    "login": "Login tab label",
    "identity": "Identity tab label"
  },
  "sections": {
    "pnv": {
      "title": "Section title",
      "description": "Section description text",
      "button_ip_label": "Optional: Override IP button label for PNV",
      "button_ip_plus_label": "Optional: Override IP+ button label for PNV",
      "button_im_label": "Optional: Override IM button label for PNV",
      "button_sim_label": "Optional: Override SIM button label for PNV",
      "button_ip_via_app_label": "Optional: Override IP via App button label for PNV"
    },
    "login": {
      "title": "Section title",
      "description": "Section description text",
      "button_ip_label": "Optional: Override IP button label for Login",
      "button_ip_plus_label": "Optional: Override IP+ button label for Login",
      "button_im_label": "Optional: Override IM button label for Login",
      "button_sim_label": "Optional: Override SIM button label for Login"
    },
    "identity": {
      "title": "Section title",
      "description": "Section description text",
      "button_anonymous_identity_label": "Optional: Override Anonymous Identity button label",
      "button_kyc_label": "Optional: Override KYC button label"
    }
  },
  "buttons": {
    "ip": "IP button label",
    "ip_plus": "IP+ button label",
    "im": "IM button label",
    "sim": "SIM button label",
    "ip_via_app": "IP via App button label",
    "anonymous_identity": "Anonymous Identity button label",
    "kyc": "KYC button label"
  },
  "footer": {
    "viettel_legal": "Legal disclaimer text",
    "viettel": "Viettel brand name",
    "privacy_policy": "Privacy Policy link text",
    "about": "About link text",
    "help": "Help link text"
  },
  "modals": {
    "about_title": "About modal title",
    "server_label": "Server label",
    "state_label": "State label",
    "developer_link": "Developer link text",
    "phone_required": "Phone number required error message",
    "phone_invalid": "Invalid phone number error message"
  }
}
```

---

## Default Locale File

The default locale strings are stored in `config/locale.json`. This file contains all the standard English text labels used throughout the application.

**Location**: `config/locale.json`

**Purpose**: Base locale strings that are used by default.

---

## Overriding Locale Strings

You can override any locale string by adding a `locale` section to your `config/default.json` file. See [Sample Config Reference](CONFIG_DEFAULT_JSON_SAMPLE.md) for the full config layout. The override system uses deep merging, which means:

- You can override individual nested properties without replacing entire sections
- Only the properties you specify will be overridden
- All other properties will remain from the default locale file

### How Override Works

1. The application loads `config/locale.json` as the base locale
2. If `config/default.json` contains a `locale` section, it merges the override values
3. The merged locale is made available to all views via `res.locals.locale`

### Override Examples

#### Example 1: Override Application Name

```json
{
  "realm": "ipification",
  "auth_servers": [...],
  "clients": [...],
  "locale": {
    "app": {
      "name": "My Custom IPification App"
    }
  }
}
```

#### Example 2: Override Tab Labels

```json
{
  "locale": {
    "tabs": {
      "pnv": "Phone Verification",
      "login": "User Login",
      "identity": "User Identity"
    }
  }
}
```

#### Example 3: Override Section Titles and Descriptions

```json
{
  "locale": {
    "sections": {
      "pnv": {
        "title": "Verify Your Phone Number",
        "description": "Use IP or IM authentication to verify your phone number."
      },
      "login": {
        "title": "Quick Login",
        "description": "Sign in using IP or IM authentication with automatic phone number sharing."
      }
    }
  }
}
```

#### Example 4: Override Button Labels

```json
{
  "locale": {
    "buttons": {
      "ip": "Internet Protocol",
      "ip_plus": "IP Plus",
      "im": "Instant Messaging",
      "kyc": "Know Your Customer"
    }
  }
}
```

#### Example 5: Override Multiple Sections

```json
{
  "locale": {
    "app": {
      "name": "Custom Brand Name"
    },
    "tabs": {
      "pnv": "Verification",
      "login": "Access"
    },
    "sections": {
      "pnv": {
        "title": "Phone Verification",
        "description": "Verify your phone number"
      }
    },
    "buttons": {
      "ip": "IP Auth",
      "im": "IM Auth"
    },
    "modals": {
      "phone_required": "Please provide your phone number",
      "phone_invalid": "The phone number format is incorrect"
    }
  }
}
```

---

## Deep Merging Behavior

The locale override system uses deep merging, which means:

- **Nested objects are merged**: If you override `app.name`, the entire `app` object is not replaced, only `name` is updated
- **Partial overrides work**: You can override just `sections.pnv.title` without affecting `sections.pnv.description`
- **Arrays are replaced**: If a locale property is an array, the entire array is replaced (not merged)

### Deep Merge Example

**Base locale.json:**

```json
{
  "sections": {
    "pnv": {
      "title": "Phone Number Verification",
      "description": "Verify phone number through IP or IM auth."
    }
  }
}
```

**Override in default.json:**

```json
{
  "locale": {
    "sections": {
      "pnv": {
        "title": "Custom Title"
      }
    }
  }
}
```

**Result:**

```json
{
  "sections": {
    "pnv": {
      "title": "Custom Title",
      "description": "Verify phone number through IP or IM auth."
    }
  }
}
```

Notice that `description` is preserved from the base locale.

## Using Locale in Views

Locale strings are automatically available in all Pug templates via the `locale` variable. Access nested properties using dot notation:

```pug
h3.app-name #{locale.app.name}
p.description_title #{locale.sections.pnv.title}
button #{locale.buttons.ip}
```

### HTML Support in Locale Strings

Some locale fields support HTML tags for formatting. Use `!{}` instead of `#{}` to render HTML:

**Escaped (default)** - Use `#{}` for plain text:

```pug
p.description #{locale.sections.pnv.title}
```

**Unescaped (HTML)** - Use `!{}` for HTML content:

```pug
p.description !{locale.sections.pnv.description}
```

**Supported HTML tags:**

- `<br/>` or `<br>` - Line breaks
- `<b>`, `<strong>` - Bold text
- `<i>`, `<em>` - Italic text
- `<a>` - Links
- Other HTML tags as needed

**Example with HTML:**

```json
{
  "sections": {
    "pnv": {
      "title": "Phone Number Verification",
      "description": "Basic - verify your phone number<br/>Advance - verify your phone number with fraud prevention signals"
    }
  }
}
```

**Note:** Fields that support HTML are typically description fields. Title and button labels should remain plain text for consistency.

## Locale Structure Reference

### App Section

- `app.name` - Application name displayed in the header

### Tabs Section

- `tabs.pnv` - PNV tab label
- `tabs.login` - Login tab label
- `tabs.identity` - Identity tab label

### Sections Section

#### PNV Section

- `sections.pnv.title` - PNV section title
- `sections.pnv.description` - PNV section description
- `sections.pnv.button_ip_label` - Optional: Override IP button label for PNV section
- `sections.pnv.button_ip_plus_label` - Optional: Override IP+ button label for PNV section
- `sections.pnv.button_im_label` - Optional: Override IM button label for PNV section
- `sections.pnv.button_sim_label` - Optional: Override SIM button label for PNV section
- `sections.pnv.button_ip_via_app_label` - Optional: Override IP via App button label for PNV section

#### Login Section

- `sections.login.title` - Login section title
- `sections.login.description` - Login section description
- `sections.login.button_ip_label` - Optional: Override IP button label for Login section
- `sections.login.button_ip_plus_label` - Optional: Override IP+ button label for Login section
- `sections.login.button_im_label` - Optional: Override IM button label for Login section
- `sections.login.button_sim_label` - Optional: Override SIM button label for Login section

#### Identity Section

- `sections.identity.title` - Identity section title
- `sections.identity.description` - Identity section description
- `sections.identity.button_anonymous_identity_label` - Optional: Override Anonymous Identity button label
- `sections.identity.button_kyc_label` - Optional: Override KYC button label

### Buttons Section

- `buttons.ip` - IP button label
- `buttons.ip_plus` - IP+ button label
- `buttons.im` - IM button label
- `buttons.sim` - SIM button label
- `buttons.ip_via_app` - IP via App button label
- `buttons.anonymous_identity` - Anonymous Identity button label
- `buttons.kyc` - KYC button label

### Footer Section

- `footer.viettel_legal` - Legal disclaimer text
- `footer.viettel` - Viettel brand name
- `footer.privacy_policy` - Privacy Policy link text
- `footer.about` - About link text
- `footer.help` - Help link text

### Modals Section

- `modals.about_title` - About modal title
- `modals.server_label` - Server label in about modal
- `modals.state_label` - State label in about modal
- `modals.developer_link` - Developer link text
- `modals.phone_required` - Phone number required error message
- `modals.phone_invalid` - Invalid phone number error message

## Best Practices

1. **Keep base locale complete**: Always maintain a complete `locale.json` with all required strings
2. **Use overrides sparingly**: Only override strings that need to be different in specific environments
3. **Test overrides**: Verify that overrides work correctly and don't break the UI
4. **Document custom overrides**: If you add custom locale strings, document them in your project documentation
5. **Maintain consistency**: Keep naming conventions consistent across locale strings

## Troubleshooting

### Locale strings not updating

- **Check file location**: Ensure `locale.json` is in `config/` directory
- **Verify JSON syntax**: Use a JSON validator to check for syntax errors
- **Check override syntax**: Ensure override in `default.json` uses correct nested structure
- **Restart application**: Changes to locale files require application restart

### Override not working

- **Verify deep merge**: Check that you're using nested object structure correctly
- **Check property names**: Ensure property names match exactly (case-sensitive)
- **Validate JSON**: Ensure both `locale.json` and `default.json` are valid JSON

### Missing locale strings

- **Check base locale**: Ensure `locale.json` contains all required strings
- **Verify view usage**: Check that views are accessing locale properties correctly
- **Check for typos**: Verify property names match between locale file and view

## Implementation Details

The locale system is implemented in `app.js`:

1. **Loading**: `locale.json` is loaded at application startup
2. **Merging**: If `config.locale` exists, it's deep-merged with the base locale
3. **Availability**: Merged locale is added to `res.locals.locale` for all requests
4. **Deep merge**: Custom deep merge function handles nested object merging

## Related Documentation

- [Sample Config Reference](CONFIG_DEFAULT_JSON_SAMPLE.md) - Field-by-field config guide
- [Architecture Documentation](ARCHITECTURE.md) - System architecture details
- [Quick Start Guide](QUICKSTART.md) - Setup and configuration guide

## Examples

See [Sample Config Reference](CONFIG_DEFAULT_JSON_SAMPLE.md) for example locale override configurations.
