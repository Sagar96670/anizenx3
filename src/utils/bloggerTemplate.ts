export function generateBloggerXML(): string {
  return `<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE html>
<html b:css='false' b:defaultwidgetversion='2' b:layoutsVersion='3' expr:dir='data:blog.languageDirection' expr:lang='data:blog.locale' xmlns='http://www.w3.org/1999/xhtml' xmlns:b='http://www.google.com/2005/blogger/expr' xmlns:data='http://www.google.com/2005/blogger/data' xmlns:expr='http://www.google.com/2005/blogger/expr'>
<head>
    <meta charset='UTF-8'/>
    <meta content='width=device-width, initial-scale=1.0' name='viewport'/>
    <title><data:blog.pageTitle/></title>
    <b:include data='blog' name='all-head-content'/>
    <link href='https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&amp;display=swap' rel='stylesheet'/>
    <link href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' rel='stylesheet'/>
    <style expr:if='data:blog.isMobile'>
      /* Mobile specific tweaks */
    </style>
    <b:skin><![CDATA[
      /*
         * Theme Name: ANIZENX - Premium Neon Anime Streaming
         * Author: ANIZENX Team
         * Description: Professional Dark Purple Neon Anime Streaming Theme for Google Blogger
         * Version: 1.0.0
      */
      body {
        background-color: #0b0b14;
        color: #f3f4f6;
        font-family: 'Outfit', sans-serif;
        margin: 0;
        padding: 0;
        overflow-x: hidden;
      }
      a { text-decoration: none; color: inherit; }
      .navbar {
        background: rgba(11, 11, 20, 0.85);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(139, 92, 246, 0.2);
        position: sticky;
        top: 0;
        z-index: 1000;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
      }
      .logo {
        font-size: 1.5rem;
        font-weight: 800;
        background: linear-gradient(135deg, #a855f7, #ec4899);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .nav-links {
        display: flex;
        gap: 1.5rem;
        list-style: none;
        align-items: center;
      }
      .nav-links a {
        color: #d1d5db;
        font-weight: 500;
        transition: color 0.2s;
      }
      .nav-links a:hover {
        color: #c084fc;
      }
      .hero-section {
        position: relative;
        padding: 5rem 2rem;
        background: linear-gradient(to bottom, rgba(11,11,20,0.6), #0b0b14), url('https://image.tmdb.org/t/p/w1280/3zt7xPU8pn5wpc17OScVDrGgV5X.jpg') center/cover no-repeat;
        border-bottom: 1px solid rgba(139, 92, 246, 0.2);
      }
      .hero-content {
        max-width: 800px;
        margin: 0 auto;
        text-align: center;
      }
      .hero-title {
        font-size: 3rem;
        font-weight: 800;
        margin-bottom: 1rem;
        color: #fff;
        text-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
      }
      .btn-primary {
        background: linear-gradient(135deg, #8b5cf6, #ec4899);
        color: white;
        padding: 0.75rem 2rem;
        border-radius: 9999px;
        font-weight: 600;
        box-shadow: 0 0 25px rgba(139, 92, 246, 0.4);
        border: none;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        display: inline-block;
      }
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 35px rgba(168, 85, 247, 0.6);
      }
      .container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 2rem;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1.5rem;
      }
      .card {
        background: rgba(26, 26, 46, 0.6);
        border: 1px solid rgba(139, 92, 246, 0.2);
        border-radius: 1rem;
        overflow: hidden;
        transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
      }
      .card:hover {
        transform: translateY(-5px);
        border-color: #a855f7;
        box-shadow: 0 10px 30px rgba(168, 85, 247, 0.3);
      }
      .card-img {
        width: 100%;
        height: 280px;
        object-fit: cover;
      }
      .card-body {
        padding: 1rem;
      }
      .card-title {
        font-size: 1rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 0.5rem;
      }
      .footer {
        text-align: center;
        padding: 3rem;
        border-top: 1px solid rgba(139, 92, 246, 0.2);
        color: #9ca3af;
        margin-top: 4rem;
      }
    ]]></style>
</head>
<body>
    <header class='navbar'>
        <div class='logo'>
            <i class='fa-solid fa-bolt'></i> ANIZENX
        </div>
        <ul class='nav-links'>
            <li><a expr:href='data:blog.homepageUrl'>Home</a></li>
            <li><a href='#anime'>Anime</a></li>
            <li><a href='#movies'>Movies</a></li>
            <li><a href='#genres'>Genres</a></li>
        </ul>
    </header>

    <div class='hero-section'>
        <div class='hero-content'>
            <h1 class='hero-title'>Stream High Quality Anime &amp; Movies</h1>
            <p style='color: #d1d5db; margin-bottom: 2rem;'>Powered by ANIZENX with Hindi Dub, Sub, and High-Speed Video Streaming.</p>
            <a class='btn-primary' expr:href='data:blog.homepageUrl + "#anime"'>Explore Anime</a>
        </div>
    </div>

    <main class='container'>
        <b:section class='main-content' id='main-content' showaddelement='yes'>
          <b:widget id='Blog1' locked='true' title='Blog Posts' type='Blog' version='2'>
            <b:includable id='main'>
              <div class='grid'>
                <b:loop values='data:posts' var='post'>
                  <div class='card'>
                    <b:if cond='data:post.featuredImage'>
                      <img class='card-img' expr:src='data:post.featuredImage'/>
                    <b:else/>
                      <img class='card-img' src='https://image.tmdb.org/t/p/w500/hqRb1wyIVsaMukZElPBUXoJPqrR.jpg'/>
                    </b:if>
                    <div class='card-body'>
                      <h3 class='card-title'><a expr:href='data:post.url'><data:post.title/></a></h3>
                      <p style='font-size: 0.85rem; color: #9ca3af;'><data:post.date/></p>
                    </div>
                  </div>
                </b:loop>
              </div>
            </b:includable>
          </b:widget>
        </b:section>
    </main>

    <footer class='footer'>
        <p>&#169; 2026 ANIZENX. Powered by Google Blogger &amp; ANIZENX.</p>
    </footer>
</body>
</html>`;
}
