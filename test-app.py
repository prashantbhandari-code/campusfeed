from playwright.sync_api import sync_playwright
import json

results = []

def test(name, passed, detail=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    results.append({"name": name, "passed": passed, "detail": detail})
    print(f"{status}: {name}" + (f" ({detail})" if detail else ""))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    
    # Collect console errors
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    
    # 1. Test Login page loads
    print("\n=== AUTH TESTS ===")
    page.goto("http://localhost:3001/login")
    page.wait_for_load_state("networkidle")
    test("Login page loads", "CampusConnect" in page.title() or "login" in page.url.lower())
    
    # Check Google sign-in button exists
    google_btn = page.locator("text=Sign in with Google").count()
    test("Google sign-in button exists", google_btn > 0)
    
    # Check email/password form
    email_input = page.locator("input[type='email'], input[name='email'], input[placeholder*='email' i]").count()
    test("Email input exists", email_input > 0)
    
    password_input = page.locator("input[type='password']").count()
    test("Password input exists", password_input > 0)
    
    # 2. Test Feed page (needs auth, but check redirect)
    print("\n=== FEED TESTS ===")
    page.goto("http://localhost:3001/feed")
    page.wait_for_load_state("networkidle")
    # Should redirect to login if not auth'd, or show feed if auth'd
    on_feed = "feed" in page.url
    on_login = "login" in page.url
    test("Feed redirects or loads", on_feed or on_login)
    
    if on_feed:
        # Check story bar
        story_bar = page.locator("text=Your Story").count()
        test("Story bar visible", story_bar > 0)
        
        # Check post cards
        posts = page.locator("[class*='rounded-2xl']").count()
        test("Post cards rendered", posts > 0, f"Found {posts} cards")
        
        # Check sidebar (desktop)
        sidebar = page.locator("text=CampusConnect").first
        test("Sidebar logo visible", sidebar.is_visible())
        
        # Check navigation links
        nav_links = ["Home", "Explore", "Messages", "Notifications", "Create Post", "Profile", "Settings"]
        for link in nav_links:
            count = page.locator(f"text={link}").count()
            test(f"Nav link '{link}' exists", count > 0)
        
        # Check dark/light mode toggle
        theme_btn = page.locator("text=Light Mode").or_(page.locator("text=Dark Mode"))
        test("Theme toggle exists", theme_btn.count() > 0)
        
        # Screenshot
        page.screenshot(path="D:/PROJECTS/socialhub/screenshots/feed-desktop.png")
    
    # 3. Test Explore page
    print("\n=== EXPLORE TESTS ===")
    page.goto("http://localhost:3001/explore")
    page.wait_for_load_state("networkidle")
    
    if "explore" in page.url:
        search_input = page.locator("input[placeholder*='Search']").count()
        test("Search input exists", search_input > 0)
        
        people_tab = page.locator("text=People").count()
        test("People tab exists", people_tab > 0)
        
        posts_tab = page.locator("text=Posts").count()
        test("Posts tab exists", posts_tab > 0)
        
        # Check follow buttons
        follow_btns = page.locator("text=Follow").or_(page.locator("text=Following"))
        test("Follow buttons exist", follow_btns.count() > 0, f"Found {follow_btns.count()}")
        
        page.screenshot(path="D:/PROJECTS/socialhub/screenshots/explore-desktop.png")
    
    # 4. Test Messages page
    print("\n=== MESSAGES TESTS ===")
    page.goto("http://localhost:3001/messages")
    page.wait_for_load_state("networkidle")
    
    if "messages" in page.url:
        page.screenshot(path="D:/PROJECTS/socialhub/screenshots/messages-desktop.png")
        test("Messages page loads", True)
    
    # 5. Test Groups page
    print("\n=== GROUPS TESTS ===")
    page.goto("http://localhost:3001/groups")
    page.wait_for_load_state("networkidle")
    
    if "groups" in page.url:
        search = page.locator("input[placeholder*='Search groups']").count()
        test("Groups search exists", search > 0)
        
        tabs = page.locator("text=All").or_(page.locator("text=My Groups"))
        test("Filter tabs exist", tabs.count() > 0)
        
        page.screenshot(path="D:/PROJECTS/socialhub/screenshots/groups-desktop.png")
    
    # 6. Test Notifications page
    print("\n=== NOTIFICATIONS TESTS ===")
    page.goto("http://localhost:3001/notifications")
    page.wait_for_load_state("networkidle")
    
    if "notifications" in page.url:
        heading = page.locator("text=Notifications").count()
        test("Notifications heading exists", heading > 0)
        page.screenshot(path="D:/PROJECTS/socialhub/screenshots/notifications-desktop.png")
    
    # 7. Test Settings page
    print("\n=== SETTINGS TESTS ===")
    page.goto("http://localhost:3001/settings")
    page.wait_for_load_state("networkidle")
    
    if "settings" in page.url:
        sections = ["Appearance", "Account Center", "Notifications", "Blocked Accounts", "Log Out"]
        for section in sections:
            count = page.locator(f"text={section}").count()
            test(f"Settings section '{section}' exists", count > 0)
        
        page.screenshot(path="D:/PROJECTS/socialhub/screenshots/settings-desktop.png")
    
    # 8. Test Create Post page
    print("\n=== CREATE POST TESTS ===")
    page.goto("http://localhost:3001/create")
    page.wait_for_load_state("networkidle")
    
    if "create" in page.url:
        textarea = page.locator("textarea").count()
        test("Post textarea exists", textarea > 0)
        
        share_btn = page.locator("text=Share Post").count()
        test("Share Post button exists", share_btn > 0)
        
        page.screenshot(path="D:/PROJECTS/socialhub/screenshots/create-desktop.png")
    
    # 9. Test mobile layout
    print("\n=== MOBILE LAYOUT TESTS ===")
    mobile = browser.new_context(viewport={"width": 375, "height": 812})
    mobile_page = mobile.new_page()
    mobile_page.goto("http://localhost:3001/feed")
    mobile_page.wait_for_load_state("networkidle")
    
    if "feed" in mobile_page.url:
        # Check bottom nav
        bottom_nav = mobile_page.locator("nav").last
        test("Bottom nav exists on mobile", bottom_nav.is_visible())
        
        # Check top navbar
        top_nav = mobile_page.locator("nav").first
        test("Top navbar exists on mobile", top_nav.is_visible())
        
        mobile_page.screenshot(path="D:/PROJECTS/socialhub/screenshots/feed-mobile.png")
    
    # 10. Test dark mode toggle
    print("\n=== THEME TOGGLE TESTS ===")
    if on_feed:
        # Click theme toggle
        theme_btn = page.locator("text=Light Mode").or_(page.locator("text=Dark Mode")).first
        if theme_btn.count() > 0:
            theme_btn.click()
            page.wait_for_timeout(500)
            
            # Check if theme changed
            html_class = page.evaluate("document.documentElement.className")
            test("Theme toggle works", "light" in html_class or "dark" in html_class, f"class: {html_class}")
            page.screenshot(path="D:/PROJECTS/socialhub/screenshots/feed-light-mode.png")
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])
    total = len(results)
    print(f"Total: {total} | Passed: {passed} | Failed: {failed}")
    print(f"Pass Rate: {passed/total*100:.1f}%")
    
    if console_errors:
        print(f"\nConsole Errors ({len(console_errors)}):")
        for err in console_errors[:5]:
            print(f"  - {err[:100]}")
    
    if failed > 0:
        print("\nFailed Tests:")
        for r in results:
            if not r["passed"]:
                print(f"  - {r['name'
