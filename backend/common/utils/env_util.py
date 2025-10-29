import os
from pathlib import Path

import environ
from environ.environ import Env


def get_env() -> Env:
    env = environ.Env()
    env_path = os.path.join(
        Path(__file__).resolve().parent.parent.parent.parent, ".env"
    )
    if os.path.exists(env_path):
        environ.Env.read_env(env_path)

    return env
