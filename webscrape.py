import sys
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import os
from twilio.rest import Client

# --- Input handling ---
user_input = sys.argv[1] if len(sys.argv) > 1 else "wireless mouse"
target_price = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
phone_number = sys.argv[3] if len(sys.argv) > 3 else ""

load_dotenv()
account_sid = os.environ["TWILIO_ACCOUNT_SID"]
auth_token = os.environ["TWILIO_AUTH_TOKEN"]

# Save URL to history file if not already present
with open('saved_input.txt', 'a+') as file:
    file.seek(0)
    contents = file.read()
    if user_input not in contents:
        if contents and not contents.endswith('\n'):
            file.write('\n')
        file.write(user_input + '\n')

# --- URL construction ---
if user_input.startswith("http://") or user_input.startswith("https://"):
    url = user_input
else:
    query = user_input.replace(" ", "+")
    url = f"https://www.amazon.com/s?k={query}"

headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,kn;q=0.6",
    "Dnt": "1",
    "Priority": "u=0, i",
    "Sec-Ch-Ua": "'Not)A;Brand';v='8', 'Chromium';v='138', 'Google Chrome';v='138'",
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": "'Windows'",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    "X-Amzn-Trace-Id": "Root=1-68947585-5ed0223209ce826d7986b8df"
}

response = requests.get(url, headers=headers)
page_html = response.text
soup = BeautifulSoup(page_html, "html.parser")

# --- Price extraction for Amazon India ---
price = None

price_whole = soup.find(class_="a-price-whole")
if price_whole:
    price_str = price_whole.get_text().replace(',', '').strip()
    try:
        price = float(price_str)
    except Exception:
        price = None
else:
    # Try fallback selectors (optional, expand as needed)
    price_alt = soup.find(class_="olpWrapper a-size-small")
    if price_alt:
        try:
            price = float(price_alt.get_text().replace(',', '').strip())
        except Exception:
            price = None
    else:
        price_id = soup.find(id="formattedPrice")
        if price_id:
            try:
                price = float(price_id.get_text().replace(',', '').strip())
            except Exception:
                price = None

# --- SMS alert and output ---
if price is not None:
    if price <= target_price and phone_number:
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=f"Price alert! The product is now ${price}",
            from_="+17625503038",
            to=phone_number
        )
        print(f"SMS sent to {phone_number}: {message.status}")
    else:
        print(f"Current price: ${price} - Target price: ${target_price}. No SMS sent.")
else:
    print("Could not find or parse the price for the product. No SMS sent.")
