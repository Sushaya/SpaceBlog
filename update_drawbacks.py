import build_final_docx
import os

# Update build_final_docx script or run regeneration
img_dir = r'C:\Users\ACER\.gemini\antigravity\scratch\blogspace\diagrams'
out_docx = r'C:\Users\ACER\.gemini\antigravity\scratch\blogspace\BlogSpace_Project_Report.docx'
user_uploaded_docx = r'C:\Users\ACER\.gemini\antigravity\brain\2f272290-eebc-4be7-904e-588f7f6e4954\.user_uploaded\media_1790788234255.docx'

build_final_docx.generate_report(out_docx, user_uploaded_docx, img_dir)
print('DOCX SUCCESSFULLY UPDATED WITH EXACT DRAWBACKS!')
