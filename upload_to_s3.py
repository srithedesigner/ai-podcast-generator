import boto3
from botocore.exceptions import NoCredentialsError
import os

def upload_file_to_s3(local_path: str, s3_path: str) -> str:
    """
    Upload a single file to AWS S3.
    
    :param local_path: Local path of the file to upload
    :param s3_path: Path where the file will be stored in S3
    :return: Public URL of the uploaded file
    """
    # Normalize file paths to use forward slashes
    local_path = local_path.replace('\\', '/')
    s3_path = s3_path.replace('\\', '/')

    s3 = boto3.client('s3')
    s3_bucket = "test-bucket-aws-mine"

    try:
        # Upload the file, overwriting if it already exists
        s3.upload_file(local_path, s3_bucket, s3_path)
        print("File uploaded successfully, overwriting the existing one if necessary.")
        
        # Generate the S3 file URL from the path
        s3_file_url = f"https://{s3_bucket}.s3.amazonaws.com/{s3_path}"
        return s3_file_url
    except NoCredentialsError:
        print("Credentials not available")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None

if __name__ == "__main__":
    # Assuming the sample user image is stored in 'user_content/sample/' directory
    sample_image_directory = ''
    sample_image_name = 'src/aws_tools/final_video.mp4'  # Replace with your actual image file name
    sample_image_path = os.path.join(sample_image_directory, sample_image_name)
    print(sample_image_path)
    # Upload the sample user image to S3a
    print(upload_file_to_s3(sample_image_path, sample_image_name))