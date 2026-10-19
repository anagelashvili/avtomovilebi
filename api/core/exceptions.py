"""Georgian versions of Django REST Framework's built-in error messages.

DRF ships no Georgian translation, so its standard messages ("This field is
required." etc.) would reach users in English. Our own messages are already
Georgian; only English (ASCII) ones with a known error code are replaced.
"""

from rest_framework.views import exception_handler as drf_exception_handler

MESSAGES = {
    "required": "ეს ველი სავალდებულოა.",
    "blank": "ეს ველი არ უნდა იყოს ცარიელი.",
    "null": "ეს ველი არ უნდა იყოს ცარიელი.",
    "invalid": "მნიშვნელობა არასწორია.",
    "invalid_choice": "აირჩიეთ სიიდან.",
    "max_length": "ტექსტი ძალიან გრძელია.",
    "min_length": "ტექსტი ძალიან მოკლეა.",
    "max_value": "მნიშვნელობა ძალიან დიდია.",
    "min_value": "მნიშვნელობა ძალიან მცირეა.",
    "max_string_length": "მნიშვნელობა ძალიან დიდია.",
    "not_authenticated": "გთხოვთ, შეხვიდეთ სისტემაში.",
    "authentication_failed": "გთხოვთ, შეხვიდეთ სისტემაში.",
    "permission_denied": "ამის გაკეთების უფლება არ გაქვთ.",
    "not_found": "ვერ მოიძებნა.",
    "method_not_allowed": "ეს მოქმედება დაუშვებელია.",
    "parse_error": "მოთხოვნა არასწორია.",
    "unsupported_media_type": "ფაილის ფორმატი არ არის მხარდაჭერილი.",
    "throttled": "ძალიან ბევრი მცდელობა. სცადეთ ცოტა ხანში.",
}

# Numeric fields say "A valid integer is required." with code "invalid".
NUMBER_INVALID = "მიუთითეთ რიცხვი."


def _translate(data, codes):
    if isinstance(data, dict) and isinstance(codes, dict):
        return {k: _translate(v, codes.get(k)) for k, v in data.items()}
    if isinstance(data, list):
        codes = codes if isinstance(codes, list) else [codes] * len(data)
        return [_translate(v, c) for v, c in zip(data, codes)]
    if isinstance(data, str) and data.isascii() and isinstance(codes, str):
        if codes == "invalid" and ("integer" in data or "number" in data):
            return NUMBER_INVALID
        return MESSAGES.get(codes, data)
    return data


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None and hasattr(exc, "get_codes"):
        codes = exc.get_codes()
        if isinstance(response.data, dict) and "detail" in response.data and not isinstance(codes, dict):
            codes = {"detail": codes}
        response.data = _translate(response.data, codes)
    return response
