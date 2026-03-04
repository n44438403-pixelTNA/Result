from playwright.sync_api import sync_playwright

def inspect_console(page):
    page.on('console', lambda msg: print(f'Console: {msg.text}'))
    page.on('pageerror', lambda err: print(f'PageError: {err}'))
    print('Navigating to login page...')
    page.goto('http://localhost:5173/login')
    page.get_by_placeholder('nadimanwar794@gmail.com').fill('nadimanwar794@gmail.com')
    page.get_by_placeholder('********').fill('NSTA')
    page.get_by_role('button', name='Login', exact=True).click()
    page.wait_for_timeout(4000)

if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        inspect_console(page)
        browser.close()
