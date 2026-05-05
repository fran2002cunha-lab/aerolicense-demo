def test_qr_returns_png(client):
    hash_val = "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1"
    res = client.get(f"/documents/qr/{hash_val}")
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"
    assert len(res.content) > 100
    assert res.content[:4] == b"\x89PNG"  # PNG magic bytes

def test_qr_any_hash_works(client):
    hash_val = "0x0000000000000000000000000000000000000000000000000000000000000000"
    res = client.get(f"/documents/qr/{hash_val}")
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"
    assert len(res.content) > 100
    assert res.content[:4] == b"\x89PNG"

def test_qr_invalid_hash_rejected(client):
    res = client.get("/documents/qr/invalid-hash")
    assert res.status_code == 400
