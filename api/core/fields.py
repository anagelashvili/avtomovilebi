from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models


def _fernet():
    return Fernet(settings.FIELD_ENCRYPTION_KEY.encode())


class EncryptedCharField(models.TextField):
    """Stores the value encrypted at rest; Python code sees plain text.

    Encrypted values can't be filtered or searched in the database, so use
    this only for data that is read by primary key (personal ID, phone).
    """

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value in (None, ""):
            return value
        return _fernet().encrypt(value.encode()).decode()

    def from_db_value(self, value, expression, connection):
        if value in (None, ""):
            return value
        try:
            return _fernet().decrypt(value.encode()).decode()
        except InvalidToken as exc:
            raise ValueError("Cannot decrypt field: wrong FIELD_ENCRYPTION_KEY?") from exc
