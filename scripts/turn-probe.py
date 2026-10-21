# Minimal TURN Allocate probe: does Cloudflare's TURN server accept the
# credentials /api/ice-servers signs? Tests both HMAC key derivations
# (hex-decoded vs base64-decoded secret) and UDP + TCP transports.
import socket, struct, os, hashlib, hmac, sys

HOST = "standard.turn.cloudflare.com"
UID = "02d39bf2345240d4cca0ced08a104020"
SECRET = "afe5ac0ea194324470b847ed11aa02c7e60c902d172a8cc7a69b50762a07081b"
MAGIC = 0x2112A442

def attrs_bytes(attrs):
    body = b""
    for t, v in attrs:
        body += struct.pack("!HH", t, len(v)) + v
        if len(v) % 4:
            body += b"\x00" * (4 - len(v) % 4)
    return body

def stun(msg_type, attrs, txid, key=None):
    body = attrs_bytes(attrs)
    if key:
        hdr = struct.pack("!HHI", msg_type, len(body) + 24, MAGIC) + txid
        mi = hmac.new(key, hdr + body, hashlib.sha1).digest()
        return hdr + body + struct.pack("!HH", 0x0008, 20) + mi
    return struct.pack("!HHI", msg_type, len(body), MAGIC) + txid + body

def parse(data):
    attrs = {}
    i = 20
    while i + 4 <= len(data):
        t, l = struct.unpack("!HH", data[i:i+4])
        attrs[t] = data[i+4:i+4+l]
        i += 4 + l + ((4 - l % 4) % 4)
    return attrs

def err(attrs):
    ec = attrs.get(0x0009)
    return ec[4:].decode("utf-8", "replace") if ec else None

def turn_allocate_udp(username, password, timeout=6):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(timeout)
    ip = socket.gethostbyname(HOST)
    srv = (ip, 3478)
    tx = os.urandom(12)
    sock.sendto(stun(0x0003, [(0x0019, struct.pack("!Bxxx", 17))], tx), srv)
    data, _ = sock.recvfrom(2048)
    mt = struct.unpack("!H", data[0:2])[0]
    a = parse(data)
    realm = a.get(0x0014, b"").decode()
    nonce = a.get(0x0015, b"")
    print(f"  [{hex(mt)}] realm={realm!r} nonce_len={len(nonce)} err={err(a)}")
    key = hashlib.md5(f"{username}:{realm}:{password}".encode()).digest()
    tx = os.urandom(12)
    msg = stun(0x0003, [
        (0x0019, struct.pack("!Bxxx", 17)),
        (0x0006, username.encode()),
        (0x0014, realm.encode()),
        (0x0015, nonce),
    ], tx, key)
    sock.sendto(msg, srv)
    data, _ = sock.recvfrom(2048)
    mt = struct.unpack("!H", data[0:2])[0]
    a = parse(data)
    print(f"  [{hex(mt)}] err={err(a)} xor-relayed={'0x0016' and (0x0016 in a)} lifetime={struct.unpack('!I', a[0x000d])[0] if 0x000d in a else None}")
    return "success" if mt == 0x0103 else "auth-failed"

# credential derivations: hex-decoded secret vs base64-decoded secret
import time
expiry = int(time.time()) + 600
username = f"{expiry}.{UID}"
cred_hex = hmac.new(bytes.fromhex(SECRET), username.encode(), hashlib.sha256).digest()   # what my server ships
cred_b64key = hmac.new(__import__("base64").b64decode(SECRET), username.encode(), hashlib.sha256).digest()
import base64
cred_b64raw = hmac.new(SECRET.encode(), username.encode(), hashlib.sha256).digest()      # raw-string variant

variants = {
    "hex-decoded (current deploy)": base64.b64encode(cred_hex).decode(),
    "base64-decoded secret": base64.b64encode(cred_b64key).decode(),
    "raw-string secret": base64.b64encode(cred_b64raw).decode(),
}

print("=== STUN binding (reachability) ===")
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.settimeout(5)
    ip = socket.gethostbyname(HOST)
    s.sendto(stun(0x0001, [], os.urandom(12)), (ip, 3478))
    d, _ = s.recvfrom(2048)
    print(f"  binding ok from {ip}:3478, type={hex(struct.unpack('!H', d[0:2])[0])}")
except Exception as e:
    print("  binding FAILED:", e); sys.exit(1)

for name, pw in variants.items():
    print(f"=== Allocate with {name} ===")
    try:
        print("  verdict:", turn_allocate_udp(username, pw))
    except socket.timeout:
        print("  TIMEOUT (UDP blocked?)")
    except Exception as e:
        print("  error:", e)
