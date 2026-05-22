import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "BE"))


def test_payment_signature_matches_payos_documentation_sample():
    from app.services.payos import build_payment_signature

    checksum_key = "1a54716c8f0efb2744fb28b6e38b25da7f67a925d98bc1c18bd8faaecadd7675"
    data = {
        "orderCode": 123,
        "amount": 3000,
        "description": "VQRIO123",
        "accountNumber": "12345678",
        "reference": "TF230204212323",
        "transactionDateTime": "2023-02-04 18:25:00",
        "currency": "VND",
        "paymentLinkId": "124c33293c43417ab7879e14c8d9eb18",
        "code": "00",
        "desc": "Thành công",
        "counterAccountBankId": "",
        "counterAccountBankName": "",
        "counterAccountName": "",
        "counterAccountNumber": "",
        "virtualAccountName": "",
        "virtualAccountNumber": "",
    }

    assert build_payment_signature(data, checksum_key) == "412e915d2871504ed31be63c8f62a149a4410d34c4c42affc9006ef9917eaa03"


def test_verify_webhook_signature_rejects_tampered_amount():
    from app.services.payos import build_payment_signature, verify_payment_webhook_signature

    checksum_key = "test_checksum"
    data = {
        "orderCode": 987654,
        "amount": 99_000,
        "description": "INV987654",
        "code": "00",
        "desc": "Thành công",
    }
    signature = build_payment_signature(data, checksum_key)

    tampered = {**data, "amount": 199_000}

    assert verify_payment_webhook_signature(data, signature, checksum_key) is True
    assert verify_payment_webhook_signature(tampered, signature, checksum_key) is False
