import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine

logger = logging.getLogger("mandiq.database")

# Search for .env in backend directory, then workspace root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_env = os.path.abspath(os.path.join(current_dir, "../../.env"))
root_env = os.path.abspath(os.path.join(current_dir, "../../../.env"))

if os.path.exists(backend_env):
    load_dotenv(backend_env)
elif os.path.exists(root_env):
    load_dotenv(root_env)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Please ensure backend/.env or .env contains a valid DATABASE_URL."
    )

logger.info("Initializing SQLAlchemy engine (pool_pre_ping=True)")

engine = create_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)