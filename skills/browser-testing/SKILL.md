---
name: browser-testing
description: Browser automation and visual testing for web development using Playwright MCP
---

# Browser Testing Skill

## USE WHEN
- User asks to test a web application or user interface
- User needs to debug UI/frontend issues visually
- User wants to capture screenshots of a webpage
- User needs to automate browser interactions (clicks, form fills)
- User asks to validate responsive design or cross-browser behavior
- User wants to test user workflows end-to-end

## CAPABILITIES
This skill provides browser automation through Playwright MCP:

- **Visual Debugging**: Capture screenshots and visual state
- **DOM Interaction**: Click elements, fill forms, navigate pages
- **Content Extraction**: Get page HTML, extract text/data
- **Responsive Testing**: Test different viewport sizes
- **User Flow Automation**: Complete multi-step workflows
- **Debug Assistance**: Inspect elements, check CSS/JS rendering

## MCP TOOLS AVAILABLE

All Playwright MCP tools are prefixed with `mcp__playwright_*`. Common tools include:

### Navigation & Screenshots
```bash
# Navigate to a page and capture screenshot
mcp__playwright_navigate --url "https://example.com"
mcp__playwright_screenshot --selector "body" --output "page.png"

# Screenshot specific element
mcp__playwright_screenshot --selector "#dashboard" --output "dashboard.png"
```

### Element Interaction
```bash
# Click an element
mcp__playwright_click --selector "#submit-button"

# Fill form fields
mcp__playwright_fill --selector "input[name='email']" --value "test@example.com"
mcp__playwright_fill --selector "input[name='password']" --value "testpass123"

# Press keyboard keys
mcp__playwright_press --selector "input[name='search']" --key "Enter"
```

### Content & Inspection
```bash
# Get page content
mcp__playwright_content --selector "body"

# Get element text
mcp__playwright_text_content --selector ".error-message"

# Get element attributes
mcp__playwright_get_attribute --selector "a.link" --attribute "href"

# Evaluate JavaScript
mcp__playwright_evaluate --script "document.querySelector('.price').innerText"
```

### Viewport & Responsive Testing
```bash
# Set viewport for mobile testing
mcp__playwright_set_viewport --width 375 --height 667  # iPhone SE

# Set viewport for tablet
mcp__playwright_set_viewport --width 768 --height 1024  # iPad

# Set viewport for desktop
mcp__playwright_set_viewport --width 1920 --height 1080  # Full HD
```

## COMMON WORKFLOWS

### Workflow 1: Test Login Flow
```bash
# 1. Navigate to login page
mcp__playwright_navigate --url "https://app.example.com/login"

# 2. Take initial screenshot
mcp__playwright_screenshot --selector "body" --output "login-page.png"

# 3. Fill credentials
mcp__playwright_fill --selector "input[name='email']" --value "test@example.com"
mcp__playwright_fill --selector "input[name='password']" --value "password123"

# 4. Click login button
mcp__playwright_click --selector "button[type='submit']"

# 5. Wait and verify redirect (check URL or dashboard element)
mcp__playwright_screenshot --selector ".dashboard" --output "logged-in.png"

# 6. Report success
echo "✅ Login flow completed successfully"
```

### Workflow 2: Debug CSS Issue
```bash
# 1. Navigate to page with issue
mcp__playwright_navigate --url "https://app.example.com/profile"

# 2. Capture desktop view
mcp__playwright_screenshot --selector ".profile-card" --output "desktop-view.png"

# 3. Switch to mobile viewport
mcp__playwright_set_viewport --width 375 --height 667

# 4. Capture mobile view
mcp__playwright_screenshot --selector ".profile-card" --output "mobile-view.png"

# 5. Inspect element styles
mcp__playwright_evaluate --script "getComputedStyle(document.querySelector('.profile-card')).display"

# 6. Report findings
echo "📊 Desktop shows correctly, mobile has display: none issue"
```

### Workflow 3: Test Form Submission
```bash
# 1. Navigate to form
mcp__playwright_navigate --url "https://app.example.com/contact"

# 2. Fill all fields
mcp__playwright_fill --selector "#name" --value "Test User"
mcp__playwright_fill --selector "#email" --value "test@example.com"
mcp__playwright_fill --selector "#message" --value "This is a test message"

# 3. Submit form
mcp__playwright_click --selector "button.submit"

# 4. Check for success message
mcp__playwright_text_content --selector ".success-message"

# 5. Capture confirmation
mcp__playwright_screenshot --selector "body" --output "form-success.png"
```

### Workflow 4: Extract Data from Page
```bash
# 1. Navigate to page
mcp__playwright_navigate --url "https://explorer.arkd.com/vtxos"

# 2. Get all vtxo IDs
mcp__playwright_evaluate --script "Array.from(document.querySelectorAll('.vtxo-id')).map(el => el.textContent)"

# 3. Get table data
mcp__playwright_content --selector "table.vtxos"

# 4. Export to file or process in code
```

## BEST PRACTICES

### 1. Always Start with Navigation
```bash
# Good: Explicit navigation
mcp__playwright_navigate --url "https://app.example.com/page"
mcp__playwright_click --selector "#button"

# Bad: Assuming page is already loaded
mcp__playwright_click --selector "#button"  # May fail if page not loaded
```

### 2. Use Specific Selectors
```bash
# Good: Specific, unique selector
mcp__playwright_click --selector "#submit-form-button"
mcp__playwright_click --selector "button[data-testid='login']"

# Bad: Generic selector that may match multiple elements
mcp__playwright_click --selector "button"  # Which button?
```

### 3. Capture Screenshots for Evidence
```bash
# Always capture before and after states for debugging
mcp__playwright_screenshot --selector "body" --output "before-action.png"
mcp__playwright_click --selector "#delete-button"
mcp__playwright_screenshot --selector "body" --output "after-action.png"
```

### 4. Test Responsive Behavior
```bash
# Test key breakpoints
viewports=(
  "375x667"   # Mobile
  "768x1024"  # Tablet
  "1920x1080" # Desktop
)

for viewport in "${viewports[@]}"; do
  width=${viewport%x*}
  height=${viewport#*x}
  mcp__playwright_set_viewport --width $width --height $height
  mcp__playwright_screenshot --selector "body" --output "view-${viewport}.png"
done
```

### 5. Handle Async Operations
```bash
# Good: Wait for content to load after interaction
mcp__playwright_click --selector "#load-data-button"
sleep 2  # Give time for data to load
mcp__playwright_screenshot --selector ".data-table" --output "loaded-data.png"

# Better: Check for element visibility/content before proceeding
mcp__playwright_click --selector "#load-data-button"
mcp__playwright_wait_for_selector --selector ".data-table"  # If this tool exists
```

## USE CASES BY CONTEXT

### For ark-developer (Frontend Development)
- Validate new UI components render correctly
- Test form validation and error states
- Debug CSS issues across viewports
- Verify button clicks and navigation work
- Capture screenshots for documentation

### For ark-tester (QA/Testing)
- Execute end-to-end user workflow tests
- Verify critical user paths (login, checkout, etc.)
- Test responsive design across devices
- Validate accessibility features
- Create visual regression baselines

## LIMITATIONS

- **No actual browser required**: Playwright MCP runs headless browsers in the background
- **JavaScript required**: Sites with heavy JavaScript may need wait times
- **No network inspection**: Cannot intercept or modify network requests (use DevTools for that)
- **Single page at a time**: Cannot test multiple tabs/windows simultaneously in basic usage

## TROUBLESHOOTING

### Issue: Element not found
```bash
# Solution: Verify selector with content inspection first
mcp__playwright_content --selector "body"  # See full page HTML
# Then find correct selector in the output
```

### Issue: Click has no effect
```bash
# Solution: Ensure element is visible and not covered
mcp__playwright_screenshot --selector "body" --output "before-click.png"
# Check if element is visible in screenshot, adjust selector if needed
```

### Issue: Viewport not applying
```bash
# Solution: Set viewport BEFORE navigation
mcp__playwright_set_viewport --width 375 --height 667
mcp__playwright_navigate --url "https://app.example.com"
```

## INTEGRATION WITH ARKADIAN WORKFLOW

When the **ark-developer** or **ark-tester** agents receive tasks involving web UIs:

1. **Load this skill**: `Use the browser-testing skill`
2. **Identify test scenario**: Login? Form? Visual bug?
3. **Execute workflow**: Follow patterns above
4. **Capture evidence**: Screenshots, extracted data
5. **Report results**: Success/failure with visual proof

## EXAMPLES

### Example 1: Test arkd Admin Dashboard
```bash
# Test dashboard loads and displays data
mcp__playwright_navigate --url "http://localhost:8080/admin"
mcp__playwright_screenshot --selector "body" --output "dashboard.png"
mcp__playwright_text_content --selector ".vtxo-count"
echo "Dashboard shows 42 VTXOs"
```

### Example 2: Debug Mobile Menu
```bash
# Reproduce mobile menu bug
mcp__playwright_set_viewport --width 375 --height 667
mcp__playwright_navigate --url "http://localhost:8080"
mcp__playwright_click --selector ".hamburger-menu"
mcp__playwright_screenshot --selector "body" --output "mobile-menu-open.png"
echo "Bug confirmed: Menu overlaps content"
```

### Example 3: Validate Form Validation
```bash
# Test email validation
mcp__playwright_navigate --url "http://localhost:8080/signup"
mcp__playwright_fill --selector "#email" --value "invalid-email"
mcp__playwright_click --selector "#submit"
mcp__playwright_screenshot --selector ".error" --output "validation-error.png"
mcp__playwright_text_content --selector ".error"
echo "✅ Email validation working: 'Please enter a valid email'"
```

---

**Remember**: This skill gives you "eyes" on the browser. Use it whenever you need to see what users see, test what users do, or debug what users experience.
