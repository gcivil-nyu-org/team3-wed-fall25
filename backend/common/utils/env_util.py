import os
import environ
from pathlib import Path
from environ.environ import Env

def get_env() -> Env:
    env = environ.Env()
    environ.Env.read_env(os.path.join(Path(__file__).resolve().parent.parent.parent.parent, '.env'))

    return env