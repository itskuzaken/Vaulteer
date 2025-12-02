#!/usr/bin/env python3
"""
Extract text from HTS form images to identify all numbered questions
"""
import sys
import os
from pathlib import Path

try:
    from PIL import Image
    import pytesseract
except ImportError:
    print("Installing required packages...")
    os.system("pip install pillow pytesseract")
    from PIL import Image
    import pytesseract

def extract_text_from_image(image_path):
    """Extract text from image using OCR"""
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        return text
    except Exception as e:
        return f"Error: {e}"

def find_numbered_questions(text):
    """Find all numbered questions in text"""
    import re
    # Match patterns like "1.", "2)", "1 ", etc.
    pattern = r'^\s*(\d{1,2})[\.\)]\s+(.+?)(?=\n|$)'
    matches = re.findall(pattern, text, re.MULTILINE)
    return matches

if __name__ == "__main__":
    base_path = Path(__file__).parent / "hts-templetes"
    
    print("=" * 80)
    print("EXTRACTING TEXT FROM HTS FORM IMAGES")
    print("=" * 80)
    
    # Front page
    front_img = base_path / "blank-hts-form-front.jpg"
    print(f"\n📄 FRONT PAGE: {front_img}")
    print("-" * 80)
    if front_img.exists():
        front_text = extract_text_from_image(front_img)
        print(front_text)
        print("\n" + "=" * 80)
        print("NUMBERED QUESTIONS ON FRONT PAGE:")
        questions = find_numbered_questions(front_text)
        for num, text in questions:
            print(f"  {num}. {text[:60]}...")
    else:
        print("❌ Front image not found")
    
    print("\n" + "=" * 80)
    
    # Back page
    back_img = base_path / "blank-hts-form-back.jpg"
    print(f"\n📄 BACK PAGE: {back_img}")
    print("-" * 80)
    if back_img.exists():
        back_text = extract_text_from_image(back_img)
        print(back_text)
        print("\n" + "=" * 80)
        print("NUMBERED QUESTIONS ON BACK PAGE:")
        questions = find_numbered_questions(back_text)
        for num, text in questions:
            print(f"  {num}. {text[:60]}...")
    else:
        print("❌ Back image not found")
    
    print("\n" + "=" * 80)
    print("EXTRACTION COMPLETE")
    print("=" * 80)
