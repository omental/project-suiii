from __future__ import annotations

import argparse
import asyncio
import getpass

from app.db.session import AsyncSessionLocal
from app.services.auth_service import AuthService


async def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update the private Project SUIII user.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--password", required=False)
    args = parser.parse_args()
    password = args.password or getpass.getpass("Password: ")
    async with AsyncSessionLocal() as db:
        user = await AuthService(db).create_or_update_user(args.email, args.name, password)
        print(f"Private user ready: {user.email}")


if __name__ == "__main__":
    asyncio.run(main())
