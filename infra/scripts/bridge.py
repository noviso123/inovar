import sys
import json
import os
import time
import io
import uuid

# QUEUE_DIR should be absolute if possible, but keep it relative for now if that's the project structure
QUEUE_DIR = "infra/emails/queue"
os.makedirs(QUEUE_DIR, exist_ok=True)

# Load .env file manually
def load_env():
    env_path = "server/.env"
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value

load_env()

def send_email(params):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    email_id = str(uuid.uuid4())
    payload = {
        "id": email_id,
        "to": params.get('to'),
        "subject": params.get('subject'),
        "body": params.get('body'),
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "retries": 0
    }

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")

    # Try direct send first
    print(f"Attempting direct send of email {email_id}...", file=sys.stderr)

    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = payload['to']
    msg['Subject'] = payload['subject']
    msg.attach(MIMEText(payload['body'], 'html'))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"Email {email_id} sent successfully.", file=sys.stderr)
        return {"success": True}
    except Exception as e:
        print(f"Direct send failed for {email_id}: {e}", file=sys.stderr)
        print(f"Queuing email for retry...", file=sys.stderr)
        queue_path = os.path.join(QUEUE_DIR, f"{email_id}.json")
        with open(queue_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=4)
        return {"success": True, "queued": True}

def s3_upload(params):
    import boto3
    from botocore.client import Config
    bucket = os.getenv("AWS_BUCKET")
    file_path = params.get('file_path')
    object_key = params.get('object_key')
    content_type = params.get('content_type', 'application/octet-stream')

    s3 = boto3.client(
        's3',
        endpoint_url=os.getenv("AWS_ENDPOINT"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION"),
        config=Config(signature_version='s3v4')
    )

    try:
        s3.upload_file(file_path, bucket, object_key, ExtraArgs={'ContentType': content_type})
        url = f"{os.getenv('SUPABASE_URL')}/storage/v1/object/public/{bucket}/{object_key}"
        return {"success": True, "url": url}
    except Exception as e:
        return {"success": False, "error": str(e)}

def process_logo(params):
    from rembg import remove
    from PIL import Image
    import io

    file_path = params.get('file_path')
    company_id = params.get('company_id')
    bucket = os.getenv("AWS_BUCKET")

    if not company_id:
        return {"success": False, "error": "company_id is required for logo processing"}

    try:
        # Load image
        input_image = Image.open(file_path)

        # Remove background
        output_image = remove(input_image)

        # Standardize: Trim empty space (optional but good)
        bbox = output_image.getbbox()
        if bbox:
            output_image = output_image.crop(bbox)

        # Save to temp buffer as PNG
        img_byte_arr = io.BytesIO()
        output_image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)

        # Standardized Path
        object_key = f"logos/logo-{company_id}.png"

        # S3 Client
        s3 = boto3.client(
            's3',
            endpoint_url=os.getenv("AWS_ENDPOINT"),
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION"),
            config=Config(signature_version='s3v4')
        )

        # Upload
        s3.put_object(
            Bucket=bucket,
            Key=object_key,
            Body=img_byte_arr,
            ContentType='image/png'
        )

        url = f"{os.getenv('SUPABASE_URL')}/storage/v1/object/public/{bucket}/{object_key}"
        return {"success": True, "url": url}

    except Exception as e:
        return {"success": False, "error": str(e)}

def s3_delete(params):
    import boto3
    from botocore.client import Config
    bucket = os.getenv("AWS_BUCKET")
    object_key = params.get('object_key')

    s3 = boto3.client(
        's3',
        endpoint_url=os.getenv("AWS_ENDPOINT"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION"),
        config=Config(signature_version='s3v4')
    )

    try:
        s3.delete_object(Bucket=bucket, Key=object_key)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def emit_nfse(params):
    import xml.etree.ElementTree as ET
    import gzip
    import base64
    from datetime import datetime
    import ssl
    import requests

    dps_data = params.get('dps_data')
    cert_path = params.get('cert_path')
    cert_password = params.get('cert_password', '')
    url = params.get('url') # e.g. https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional/nfse

    if not dps_data or not cert_path or not url:
        return {"success": False, "error": "Missing dps_data, cert_path or url"}

    try:
        # 1. Build XML (Simple implementation based on params)
        # Note: In a real system, we'd use a more robust XML builder
        root = ET.Element("DPS")
        inf_dps = ET.SubElement(root, "infDPS", Id=dps_data.get('id', 'DPS1'))
        ET.SubElement(inf_dps, "tpAmb").text = str(dps_data.get('tpAmb', 2))
        ET.SubElement(inf_dps, "dhEmi").text = dps_data.get('dhEmi', datetime.now().isoformat())
        ET.SubElement(inf_dps, "verAplic").text = dps_data.get('verAplic', 'INOVAR_1.0')
        ET.SubElement(inf_dps, "serie").text = dps_data.get('serie', 'NFS')
        ET.SubElement(inf_dps, "nDPS").text = str(dps_data.get('nDPS', 1))
        ET.SubElement(inf_dps, "dCompet").text = dps_data.get('dCompet', datetime.now().strftime("%Y-%m-%d"))
        ET.SubElement(inf_dps, "tpEmit").text = str(dps_data.get('tpEmit', 1))
        ET.SubElement(inf_dps, "cLocEmi").text = str(dps_data.get('cLocEmi', 0))
        ET.SubElement(inf_dps, "tpOp").text = str(dps_data.get('tpOp', 1))

        # Prestador
        prest = ET.SubElement(inf_dps, "prest")
        ET.SubElement(prest, "CNPJ").text = dps_data.get('prest', {}).get('CNPJ', '')
        if dps_data.get('prest', {}).get('IM'):
            ET.SubElement(prest, "IM").text = dps_data.get('prest', {}).get('IM')

        # Tomador
        toma = ET.SubElement(inf_dps, "toma")
        if dps_data.get('toma', {}).get('CNPJ'):
            ET.SubElement(toma, "CNPJ").text = dps_data.get('toma', {}).get('CNPJ')
        elif dps_data.get('toma', {}).get('CPF'):
            ET.SubElement(toma, "CPF").text = dps_data.get('toma', {}).get('CPF')
        ET.SubElement(toma, "xNome").text = dps_data.get('toma', {}).get('xNome', '')

        # Endereco Tomador
        end = dps_data.get('toma', {}).get('end', {})
        if end:
            t_end = ET.SubElement(toma, "end")
            ET.SubElement(t_end, "xLgr").text = end.get('xLgr', '')
            ET.SubElement(t_end, "nro").text = end.get('nro', '')
            if end.get('xCpl'): ET.SubElement(t_end, "xCpl").text = end.get('xCpl')
            ET.SubElement(t_end, "xBairro").text = end.get('xBairro', '')
            ET.SubElement(t_end, "cMun").text = str(end.get('cMun', 0))
            ET.SubElement(t_end, "UF").text = end.get('UF', '')
            ET.SubElement(t_end, "CEP").text = end.get('CEP', '')

        # Servico
        serv = ET.SubElement(inf_dps, "serv")
        ET.SubElement(serv, "cLocPrestacao").text = str(dps_data.get('serv', {}).get('cLocPrestacao', 0))
        c_serv = ET.SubElement(serv, "cServ")
        ET.SubElement(c_serv, "cTribNac").text = dps_data.get('serv', {}).get('cServ', {}).get('cTribNac', '')
        if dps_data.get('serv', {}).get('cServ', {}).get('CNAE'):
            ET.SubElement(c_serv, "CNAE").text = dps_data.get('serv', {}).get('cServ', {}).get('CNAE')
        ET.SubElement(serv, "xDescServ").text = dps_data.get('serv', {}).get('xDescServ', '')

        # Valores
        vals = ET.SubElement(inf_dps, "valores")
        v_serv = ET.SubElement(vals, "vServPrest")
        ET.SubElement(v_serv, "vReceb").text = f"{dps_data.get('valores', {}).get('vServPrest', {}).get('vReceb', 0.0):.2f}"

        vt_dc = ET.SubElement(vals, "vTDC")
        v_data = dps_data.get('valores', {}).get('vTDC', {})
        ET.SubElement(vt_dc, "vBC").text = f"{v_data.get('vBC', 0.0):.2f}"
        ET.SubElement(vt_dc, "pAliqAplic").text = f"{v_data.get('pAliqAplic', 0.0):.2f}"
        ET.SubElement(vt_dc, "vISSQN").text = f"{v_data.get('vISSQN', 0.0):.2f}"
        ET.SubElement(vt_dc, "tISSQN").text = str(v_data.get('tISSQN', 1))

        # 2. Convert to XML String
        xml_string = '<?xml version="1.0" encoding="UTF-8"?>' + ET.tostring(root, encoding="unicode")

        # 3. Compress GZip
        gzip_buf = io.BytesIO()
        with gzip.GzipFile(fileobj=gzip_buf, mode="wb") as f:
            f.write(xml_string.encode('utf-8'))
        gzip_data = gzip_buf.getvalue()

        # 4. Base64
        xml_b64 = base64.b64encode(gzip_data).decode('utf-8')

        # 5. Send POST with mTLS
        # Reusing the PEM for both cert and key (Go behavior)
        payload = {"dpsXmlGZipB64": xml_b64}

        response = requests.post(
            url,
            json=payload,
            cert=(cert_path, cert_path), # (cert, key)
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=30
        )

        if response.status_code != 200:
             return {"success": False, "error": f"API Error {response.status_code}: {response.text}"}

        return {"success": True, "data": response.json()}

    except Exception as e:
        return {"success": False, "error": str(e)}

def cancel_nfse(params):
    url = params.get('url')
    cert_path = params.get('cert_path')
    chave_acesso = params.get('chave_acesso')
    motivo = params.get('motivo', '1')
    x_motivo = params.get('x_motivo', 'Erro de emissao')

    if not url or not cert_path or not chave_acesso:
        return {"success": False, "error": "Missing url, cert_path or chave_acesso"}

    try:
        payload = {
            "chaveAcesso": chave_acesso,
            "cMotivo": motivo,
            "xMotivo": x_motivo
        }

        response = requests.post(
            url,
            json=payload,
            cert=(cert_path, cert_path),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=30
        )

        if response.status_code != 200:
            return {"success": False, "error": f"API Error {response.status_code}: {response.text}"}

        return {"success": True, "data": response.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}

def render_danfse(params):
    from jinja2 import Template
    data = params.get('data', {})

    # Simple template (reusing the logic from Go)
    # In a full system, we'd load this from a .html file
    template_str = """
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: sans-serif; font-size: 11px; padding: 20px; }
            .header { border: 2px solid #000; padding: 15px; display: flex; justify-content: space-between; }
            .section { border: 1px solid #ccc; margin-top: 10px; padding: 10px; }
            .total-row { background: #0066cc; color: white; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <div><strong>DANFS-e</strong><br>Doc. Auxiliar NFS-e</div>
            <div>NF-e: {{ data.NumeroNFSe }}</div>
        </div>
        <div class="section">
            <strong>Prestador:</strong> {{ data.PrestadorNome }} ({{ data.PrestadorCNPJ }})
        </div>
        <div class="section">
            <strong>Tomador:</strong> {{ data.TomadorNome }} ({{ data.TomadorDocumento }})
        </div>
        <div class="section">
            <strong>Servico:</strong><br>{{ data.Discriminacao }}
        </div>
        <div class="section">
            <strong>Valor Liquido:</strong> {{ data.ValorLiquido }}
        </div>
    </body>
    </html>
    """

    try:
        t = Template(template_str)
        html = t.render(data=data)
        return {"success": True, "html": html}
    except Exception as e:
        return {"success": False, "error": str(e)}

def calculate_taxes(params):
    valor_servicos = params.get('valor_servicos', 0.0)
    valor_deducoes = params.get('valor_deducoes', 0.0)
    config = params.get('config', {})
    regime = config.get('regime_tributario', 'SIMPLES_NACIONAL')

    base_calculo = valor_servicos - valor_deducoes
    result = {
        "valorServicos": valor_servicos,
        "valorDeducoes": valor_deducoes,
        "baseCalculo": base_calculo,
        "regimeTributario": regime,
        "totalTributos": 0.0,
        "aliquotaIss": 0.0,
        "valorIss": 0.0,
    }

    if regime == 'MEI':
        result["observacoes"] = "MEI: Impostos ja inclusos no DAS mensal fixo."
    elif regime == 'SIMPLES_NACIONAL':
        faixa = config.get('faixa_simples_nac', 'FAIXA_1')
        aliquota = 6.0 # Simplified progressive logic
        if faixa == 'FAIXA_2': aliquota = 11.2
        elif faixa == 'FAIXA_3': aliquota = 13.5

        result["aliquotaSimplesNac"] = aliquota
        result["valorSimplesNac"] = base_calculo * (aliquota / 100)
        result["totalTributos"] = result["valorSimplesNac"]
        result["aliquotaIss"] = 2.0 # Standard ISS in Simples
        result["valorIss"] = base_calculo * 0.02
        result["observacoes"] = f"Simples Nacional - Aliquota: {aliquota}%"
    elif regime in ['LUCRO_PRESUMIDO', 'LUCRO_REAL']:
        result["aliquotaIss"] = config.get('aliquotaIssPadrao', 5.0)
        result["valorIss"] = base_calculo * (result["aliquotaIss"] / 100)
        result["aliquotaPis"] = 0.65 if regime == 'LUCRO_PRESUMIDO' else 1.65
        result["valorPis"] = base_calculo * (result["aliquotaPis"] / 100)
        result["aliquotaCofins"] = 3.0 if regime == 'LUCRO_PRESUMIDO' else 7.6
        result["valorCofins"] = base_calculo * (result["aliquotaCofins"] / 100)

        result["totalTributos"] = result["valorIss"] + result["valorPis"] + result["valorCofins"]
        result["observacoes"] = f"Regime {regime}"

    result["valorLiquido"] = base_calculo - result["totalTributos"]
    return {"success": True, "data": result}

def lookup_cnpj(params):
    import requests
    import re
    # Extract only digits
    raw_cnpj = params.get('cnpj', '')
    cnpj = re.sub(r'\D', '', raw_cnpj)

    if len(cnpj) != 14:
        return {"success": False, "error": f"Invalid CNPJ: {raw_cnpj} (extracted: {cnpj})"}

    print(f"Executing CNPJ lookup for: {cnpj}", file=sys.stderr)

    # Provider 1: BrasilAPI
    try:
        resp = requests.get(f"https://brasilapi.com.br/api/cnpj/v1/{cnpj}", timeout=10)
        if resp.status_code == 200:
            return {"success": True, "data": resp.json()}
        print(f"BrasilAPI failed for {cnpj}: {resp.status_code} - {resp.text}", file=sys.stderr)
    except Exception as e:
        print(f"BrasilAPI exception for {cnpj}: {e}", file=sys.stderr)

    # Provider 2: Minha Receita (Fallback)
    try:
        print(f"Attempting fallback to Minha Receita for {cnpj}...", file=sys.stderr)
        resp = requests.get(f"https://minhareceita.org/{cnpj}", timeout=10)
        if resp.status_code == 200:
            # Map Minha Receita format to BrasilAPI format if needed,
            # but usually they are very similar or the Go handler handles it.
            # Minha Receita returns data in a slightly different structure.
            # Let's see if we need to map it.
            # Inovar Go handler expects fields like 'razao_social', 'logradouro', etc.
            data = resp.json()
            # Basic mapping to satisfy common fields
            mapped_data = {
                "cnpj": data.get("cnpj"),
                "razao_social": data.get("razao_social"),
                "nome_fantasia": data.get("nome_fantasia") or data.get("razao_social"),
                "logradouro": data.get("logradouro"),
                "numero": data.get("numero"),
                "complemento": data.get("complemento"),
                "bairro": data.get("bairro"),
                "cep": data.get("cep"),
                "municipio": data.get("municipio"),
                "uf": data.get("uf"),
                "cnae_fiscal": data.get("cnae_fiscal"),
                "cnae_fiscal_descricao": data.get("cnae_fiscal_descricao"),
                "opcao_pelo_simples": data.get("opcao_pelo_simples"),
                "opcao_pelo_mei": data.get("opcao_pelo_mei")
            }
            return {"success": True, "data": mapped_data}
        print(f"Minha Receita failed for {cnpj}: {resp.status_code} - {resp.text}", file=sys.stderr)
    except Exception as e:
        print(f"Minha Receita exception for {cnpj}: {e}", file=sys.stderr)

    return {"success": False, "error": f"All CNPJ providers failed for {cnpj}"}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No input provided"}))
        return

    try:
        request = json.loads(sys.argv[1])
        action = request.get("action")
        params = request.get("params", {})

        # Load .env if not already loaded (though usually parent process does it)
        # from dotenv import load_dotenv
        # load_dotenv()

        result = {"success": False, "error": "Unknown action"}

        if action == "send_email":
            result = send_email(params)
        elif action == "process_logo":
            result = process_logo(params)
        elif action == "s3_upload" or action == "upload":
            result = s3_upload(params)
        elif action == "s3_delete":
            result = s3_delete(params)
        elif action == "emit_nfse":
            result = emit_nfse(params)
        elif action == "cancel_nfse":
            result = cancel_nfse(params)
        elif action == "calculate_taxes":
            result = calculate_taxes(params)
        elif action == "render_danfse":
            result = render_danfse(params)
        elif action == "lookup_cnpj":
            result = lookup_cnpj(params)

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
