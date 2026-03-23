import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

from services.vnpay import build_payment_url, build_secure_hash, verify_response


def test_secure_hash_is_stable_for_sorted_params():
    params = {
        "vnp_Amount": "9900000",
        "vnp_Command": "pay",
        "vnp_TmnCode": "TESTCODE",
        "vnp_TxnRef": "INV123",
    }
    first = build_secure_hash(params, "secret")
    second = build_secure_hash(dict(reversed(list(params.items()))), "secret")
    assert first == second


def test_verify_response_accepts_valid_signature():
    params = {
        "vnp_Amount": "9900000",
        "vnp_Command": "pay",
        "vnp_TmnCode": "TESTCODE",
        "vnp_TxnRef": "INV123",
    }
    params["vnp_SecureHash"] = build_secure_hash(params, "secret")
    assert verify_response(params, "secret") is True


def test_build_payment_url_embeds_secure_hash():
    url = build_payment_url(
        "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
        {
            "vnp_Amount": 9900000,
            "vnp_Command": "pay",
            "vnp_TmnCode": "TESTCODE",
            "vnp_TxnRef": "INV123",
        },
        "secret",
    )
    assert "vnp_SecureHash=" in url
    assert "vnp_TxnRef=INV123" in url
