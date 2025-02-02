const path = require('path');
    const fs = require('fs');
    const { execSync } = require('child_process');

    function getGitTag() {
      try {
        const tag = execSync('git describe --tags --abbrev=0').toString().trim();
        return tag.startsWith('v') ? tag.substring(1) : tag;
      } catch (error) {
        return '0.0.0'; // 如果没有 Tag，返回默认值
      }
    }

    function getGitCommitHash() {
      try {
        return execSync('git rev-parse --short HEAD').toString().trim();
      } catch (error) {
        return '';
      }
    }

    function generateVersion() {
      const tag = getGitTag();
      const commitHash = getGitCommitHash();
      if (tag !== '0.0.0') {
          return tag;
      } else {
          return `0.0.0+${commitHash}`;
      }
    }

    function updateVersion(filePath, version) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const updatedContent = fileContent.replace(
        /(?<=@version\s+)([\d.]+)(?=\s*)/,
        version
      );
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
    }

    // 使用 path.resolve 获取脚本文件路径
    const filePath = path.resolve(__dirname, '..', 's1_local_time.user.js'); // 替换为你的脚本文件路径
    const version = generateVersion();
    updateVersion(filePath, version);
    console.log(`Updated version to: ${version}`);