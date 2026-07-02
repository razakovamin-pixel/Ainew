Books data exported from books.db.

Files:
- index.json: list of all books and filenames
- book_01.json ... book_13.json: one root book each, with nested chapters and hadiths
- all_books.json: combined full dataset (larger file)

Structure:
root book (type 1)
  -> sections/chapters (types 2, 3, 4)
      -> hadith entries (type 1000)

All text is UTF-8 encoded.
