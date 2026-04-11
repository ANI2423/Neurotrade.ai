"""Centralised logging setup for NeuroTrade AI."""

import logging
import sys
from datetime import datetime


def setup_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(level)

    fmt = logging.Formatter(
        "[%(asctime)s] %(levelname)-8s %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    # File handler (rotates daily)
    try:
        fh = logging.FileHandler(f"logs/neurotrade_{datetime.now().strftime('%Y%m%d')}.log")
        fh.setFormatter(fmt)
        logger.addHandler(fh)
    except OSError:
        pass  # logs/ dir may not exist in serverless envs

    return logger
