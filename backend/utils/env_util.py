import os
from pathlib import Path

import environ
from environ.environ import Env


def get_env() -> Env:
    env = environ.Env()
    environ.Env.read_env(
        os.path.join(Path(__file__).resolve().parent.parent.parent, ".env")
    )

    return env
