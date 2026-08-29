const { withAppBuildGradle } = require('@expo/config-plugins')

module.exports = function withAbiSplits(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents
    if (!contents.includes('splits {')) {
      config.modResults.contents = contents.replace(
        /defaultConfig \{/,
        `splits {
  abi {
    reset()
    enable true
    universalApk true
    include "armeabi-v7a", "arm64-v8a"
  }
}

` + '    defaultConfig {'
      )
    }
    return config
  })
}
