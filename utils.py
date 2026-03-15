import qrcode
import base64
from io import BytesIO

def generate_qr_base64(batch_id: str) -> str:
    # 1. Ensure batch_id is a string (prevents UUID objects from crashing)
    batch_id_str = str(batch_id)

    # 2. Generate the QR code containing ONLY the batch ID (prevents URL redirects)
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(batch_id_str)
    qr.make(fit=True)

    # 3. Create the image (Requires 'Pillow' library installed)
    img = qr.make_image(fill_color="black", back_color="white")

    # 4. Save to a byte buffer
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    
    # 5. FIX: ENCODE the binary bytes to Base64, then decode to a UTF-8 string
    img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    return f"data:image/png;base64,{img_base64}"