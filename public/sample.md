# MDReader sample document

A short document exercising every element the renderer supports, for manual QA and
Playwright screenshots.

## Text formatting

Plain text with **bold**, *italic*, ~~strikethrough~~, `inline code`, and a [link](https://example.com).
Here's a footnote reference[^1].

## Headings

### H3 heading
#### H4 heading
##### H5 heading
###### H6 heading

## Lists

- Unordered item one
- Unordered item two
  - Nested circle item
    - Nested square item

1. Ordered item one
2. Ordered item two
   1. Nested lower-alpha item
      1. Nested lower-roman item

- [x] Completed task
- [ ] Open task
  - [x] Nested completed task
  - [ ] Nested open task

## Blockquote

> A blockquote spanning
> multiple lines, to check quote background and border styling.

## Callouts

GitHub marker syntax:

> [!NOTE]
> Useful information the reader should notice.

> [!WARNING]
> Something that needs care.

The same cards via an `alt` attribute, for when the marker line is inconvenient:

<blockquote alt="info">

An `info` callout, equivalent to `[!NOTE]`.

</blockquote>

<blockquote alt="success">

A `success` callout, equivalent to `[!TIP]`.

</blockquote>

<blockquote alt="danger">

A `danger` callout, equivalent to `[!CAUTION]`.

</blockquote>

## Code

Inline `const x = 1` code, and fenced blocks in several languages — together these
exercise all twelve `--syn-*` tokens.

```js
// Comment: strings, numbers, template substitution
import { readFile } from 'node:fs/promises';

export class Greeter {
  #count = 0;

  async greet(name = 'world') {
    this.#count += 1;
    return `Hello, ${name}! (${this.#count})`;
  }
}

const re = /^[a-z]+$/i;
export default new Greeter();
```

```python
from dataclasses import dataclass

@dataclass
class Point:
    """A point in 2D space."""
    x: float = 0.0
    y: float = 0.0

    def norm(self) -> float:
        return (self.x ** 2 + self.y ** 2) ** 0.5

if __name__ == "__main__":
    print(Point(3, 4).norm())  # 5.0
```

```css
:root {
  --accent: #0969da;
}

article a:hover,
.callout::before {
  color: var(--accent);
  text-decoration: underline;
}
```

```html
<section class="wrapper" data-role="main">
  <!-- an HTML comment -->
  <h1 id="title">Hello</h1>
  <input type="text" disabled />
</section>
```

```bash
#!/usr/bin/env bash
set -euo pipefail

for f in *.md; do
  echo "processing ${f}"   # $$ here is a shell PID, not math
done
```

```json
{
  "name": "md-reader",
  "private": true,
  "version": "0.0.0",
  "scripts": { "dev": "vite" }
}
```

An untagged fence stays unhighlighted, since guessing the language does more harm
than good:

```
Just some plain text.
No language tag, so no coloring.
```

## Math

Display formulas use `$$…$$`. KaTeX loads only for documents that contain them.

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$

Inline-style within a sentence: $$e^{i\pi} + 1 = 0$$ — Euler's identity.

A wider formula, to check that it scrolls inside its own block rather than
stretching the article:

$$
\hat{f}(\xi) = \int_{-\infty}^{\infty} f(x)\, e^{-2\pi i x \xi}\, dx \quad\text{where}\quad \xi \in \mathbb{R}
$$

Single dollar signs are left alone, so prices such as $5 and $10 stay literal text.

## Inline HTML

Press <kbd>Ctrl</kbd> + <kbd>P</kbd> to print, and <mark>highlighted text</mark>
marks a passage.

<details>
<summary>A collapsed section</summary>

Hidden until expanded — useful for long appendices.

</details>

## Mermaid diagram

```mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Do thing]
  B -->|No| D[Skip]
```

### Invalid mermaid (error state)

```mermaid
not a real diagram type
some nonsense
```

## Tables

A prose table — cells wrap instead of being forced onto one line, and even rows
carry the zebra tint. Hover a row to see `--table-row-hover`:

| Tính năng | Mô tả |
| --- | --- |
| Cú pháp nổi bật | Tô màu mã nguồn theo từng ngôn ngữ, dùng mười hai token màu riêng biệt |
| Công thức toán | Dựng bằng KaTeX, chỉ tải khi tài liệu thật sự có công thức |
| Callout | Hai cú pháp, cùng một kiểu hiển thị |

### Numeric columns align themselves

No alignment row is written below, yet the numeric columns right-align on their
own and the prose columns do not. Digits line up by place value, so the column
can be scanned rather than read cell by cell — note how `9` sits under the ones
digit of `1,204`. The header label follows its own column:

| Gói | Số bản ghi | Dung lượng | Thay đổi | Ghi chú |
| --- | --- | --- | --- | --- |
| Alpha | 1,204 | 12.5% | +3.4 | Ổn định qua hai kỳ |
| Bravo | 87 | 4.02% | −0.5 | Giảm nhẹ so với quý trước |
| Charlie | 9 | 0.31% | +12.75 | Mới thêm trong tháng này |
| Delta | 26,530 | 61.7% | −8.2 | Chiếm phần lớn dung lượng |

Currency, parenthesised negatives, and placeholder cells stay in the same column
without breaking it — a blank or `—` carries no value, so it neither counts as
prose nor vetoes the alignment:

| Hạng mục | Chi phí | Chênh lệch |
| --- | --- | --- |
| Hạ tầng | $1,299 | (240.50) |
| Giấy phép | $99 | — |
| Đào tạo | $12,400 | (1,020) |
| Dự phòng | | 0 |

A column is only right-aligned when *every* non-blank cell reads as a number.
One prose cell opts the whole column out, which is why `Số liệu` below stays
left-aligned even though two of its three cells are numeric:

| Khu vực | Số liệu |
| --- | --- |
| Miền Bắc | 1,204 |
| Miền Trung | 87 |
| Miền Nam | chưa có số liệu |

Prose that merely *starts* with a digit is not a number, so this column is left
alone:

| Mục | Trạng thái |
| --- | --- |
| Alpha | 3 vấn đề còn lại |
| Bravo | 2024 in review |
| Charlie | 10 GB nhật ký |

### Explicit alignment always wins

An author who writes the delimiter row has already answered the question, so
`:---:` here beats the auto-detection — the numbers are centred despite reading
as a numeric column:

| Trái | Giữa | Phải |
| :--- | :---: | ---: |
| Alpha | 1,204 | 1,204 |
| Bravo | 87 | 87 |
| Charlie | 9 | 9 |

### Wide table

Exercises horizontal scroll, the edge-fade gradient, and the rounded frame
clipping the table's own square corners:

| Column Alpha | Column Bravo | Column Charlie | Column Delta | Column Echo | Column Foxtrot | Column Golf | Column Hotel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Row one alpha value | Row one bravo value | Row one charlie value | Row one delta value | Row one echo value | Row one foxtrot value | Row one golf value | Row one hotel value |
| Row two alpha value | Row two bravo value | Row two charlie value | Row two delta value | Row two echo value | Row two foxtrot value | Row two golf value | Row two hotel value |

### Long table

Long enough to scroll inside its own frame, which is what pins the header row —
scroll the block and the header stays put:

| # | Mã | Tên mục | Giá trị |
| --- | --- | --- | --- |
| 1 | A-001 | Mục thứ nhất | 1,204 |
| 2 | A-002 | Mục thứ hai | 87 |
| 3 | A-003 | Mục thứ ba | 9 |
| 4 | A-004 | Mục thứ tư | 26,530 |
| 5 | A-005 | Mục thứ năm | 412 |
| 6 | A-006 | Mục thứ sáu | 3,908 |
| 7 | A-007 | Mục thứ bảy | 55 |
| 8 | A-008 | Mục thứ tám | 17,640 |
| 9 | A-009 | Mục thứ chín | 231 |
| 10 | A-010 | Mục thứ mười | 6,015 |
| 11 | A-011 | Mục mười một | 78 |
| 12 | A-012 | Mục mười hai | 2,344 |
| 13 | A-013 | Mục mười ba | 190 |
| 14 | A-014 | Mục mười bốn | 8,721 |
| 15 | A-015 | Mục mười lăm | 76 |
| 16 | A-016 | Mục mười sáu | 5,334 |
| 17 | A-017 | Mục mười bảy | 1,230 |
| 18 | A-018 | Mục mười tám | 567 |
| 19 | A-019 | Mục mười chín | 987 |
| 20 | A-020 | Mục hai mươi | 1 |

### Rich cells

Inline formatting, code, links, and math all survive inside cells:

| Kiểu | Ví dụ | Ghi chú |
| --- | --- | --- |
| Đậm & nghiêng | **đậm**, *nghiêng*, ~~gạch~~ | Cùng một ô |
| Mã | `const x = 1` | Nền mã trong ô |
| Liên kết | [example.com](https://example.com) | Màu `--link` |
| Công thức | $$a^2 + b^2 = c^2$$ | KaTeX trong ô |

## Images

A working image:

![A placeholder image](https://via.placeholder.com/200x100)

A broken image (bad URL, exercises the fallback state):

![Broken image](https://example.invalid/does-not-exist.png)

## Horizontal rule

---

## Font tiếng Việt

Đoạn văn này dùng để kiểm tra cách font hiển thị tiếng Việt: dấu thanh chồng lên nguyên âm
đã có dấu phụ, những chữ dễ vỡ nét như **ữ**, **ỡ**, **ặ**, **ội**, **ườ**, và các chữ hoa
mang dấu như **Ổ**, **Ẫ**, **Ợ**. Nếu font thiếu glyph, chúng sẽ tụt dòng hoặc rơi về một
font dự phòng trông lệch hẳn so với phần chữ xung quanh.

Chiều cao dòng cũng cần đủ rộng: chữ tiếng Việt có dấu nằm cao hơn chữ Latin thông thường,
nên khi dòng quá sát nhau thì dấu của dòng dưới dễ chạm vào phần chân chữ của dòng trên.
Hãy thử kéo thanh *line height* trong phần tuỳ chỉnh để thấy khác biệt.

> [!TIP]
> Tiêu đề tiếng Việt vẫn tạo được liên kết neo đúng — mục lục bên phải trỏ tới
> `#font-tiếng-việt`, giữ nguyên dấu thay vì lược bỏ thành `font-ting-vit`.

Một câu dài không có chỗ ngắt hợp lệ, ví dụ đường dẫn
`https://example.com/tài-liệu/hướng-dẫn-cài-đặt-môi-trường-phát-triển`, sẽ tự xuống dòng
thay vì đẩy cả bài viết trượt ngang.

## Footnotes

[^1]: This is the footnote text, with a backlink to the reference above.
