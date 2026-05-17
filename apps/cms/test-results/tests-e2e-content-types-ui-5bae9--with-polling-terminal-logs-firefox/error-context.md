# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/e2e/content-types-ui.spec.ts >> Dynamic Content Types Creator and Visual Diff Engine >> should execute AI schema generation with polling terminal logs
- Location: tests/e2e/content-types-ui.spec.ts:40:3

# Error details

```
Error: browserType.launch: 
╔══════════════════════════════════════════════════════╗
║ Host system is missing dependencies to run browsers. ║
║ Please install them with the following command:      ║
║                                                      ║
║     sudo pnpm exec playwright install-deps           ║
║                                                      ║
║ Alternatively, use apt:                              ║
║     sudo apt-get install libasound2t64               ║
║                                                      ║
║ <3 Playwright Team                                   ║
╚══════════════════════════════════════════════════════╝
```