import boto3
import os

# Configuration from previous context
AWS_ACCESS_KEY_ID = "59fba5707ce99514f6996c002d15f617"
AWS_SECRET_ACCESS_KEY = "32a0b124a8f6c2613dffe199d2dfcc2ca5e1bb6bc77dd911ae82e77ec95d0d86"
AWS_REGION = "sa-east-1"
AWS_ENDPOINT = "https://bavgqsnsubrzazhgpywg.supabase.co/storage/v1/s3"
BUCKET = "uploads"

def test_s3():
    print("🚀 Testing Supabase S3 Connection...")

    try:
        s3 = boto3.client(
            's3',
            endpoint_url=AWS_ENDPOINT,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )

        # 1. List Buckets
        print("📂 Listing buckets...")
        response = s3.list_buckets()
        print("✅ Buckets:")
        for bucket in response['Buckets']:
            print(f" - {bucket['Name']}")

        # 2. Upload File (PDF)
        print("\n⬆️ Uploading test file (PDF)...")
        with open("s3_test.pdf", "w") as f:
            f.write("%PDF-1.4 dummy")

        s3.upload_file("s3_test.pdf", BUCKET, "s3_test.pdf", ExtraArgs={'ContentType': 'application/pdf'})
        print(f"✅ Upload successful! File: s3_test.pdf")

        # 3. List Objects
        print("\n📄 Listing objects in bucket...")
        objs = s3.list_objects_v2(Bucket=BUCKET)
        if 'Contents' in objs:
            for obj in objs['Contents']:
                print(f" - {obj['Key']} ({obj['Size']} bytes)")
        else:
            print(" - (Bucket empty)")

    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        if os.path.exists("s3_test.pdf"):
            os.remove("s3_test.pdf")

if __name__ == "__main__":
    test_s3()
