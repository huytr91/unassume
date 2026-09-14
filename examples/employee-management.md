# Example: employee management system

## Initial request

> Build an employee management system.

## Call A — detect (illustrative)

| Area | State |
| --- | --- |
| Goal | ✓ identified |
| Platform | ? |
| Authentication | ? |
| User roles | ? |
| Database | ? |
| Employee fields | ? |
| Reporting | ? |
| Deployment | ? |

Ask only gaps that **change the outcome**; order by priority.

## Sample question

```text
What platform should the application support?

○ Web
○ iOS
○ Android
○ Web + Mobile
○ Not decided
○ Other: [________]
```

## Adaptation

If user chooses **Mobile** → next may ask iOS / Android / both.  
If payment-like detail appears in another domain and is material → ask; if not material at prompt level → skip.

## When CLEAR

All blocking gaps confirmed or explicitly deferred → compile verified request:

- CONFIRMED REQUIREMENTS from answers only  
- UNRESOLVED ITEMS for deferrals  
- INSTRUCTIONS TO DOWNSTREAM AI: do not invent; ask on new material ambiguity  

Then user copies into ChatGPT / Claude / Cursor / etc.
