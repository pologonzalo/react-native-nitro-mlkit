require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroMLKitFaceRecognition"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["repository"]["url"]
  s.license      = package["license"]
  s.authors      = package["author"]
  s.source       = { :git => "https://github.com/pologonzalo/react-native-nitro-mlkit.git", :tag => s.version }

  s.platforms    = { :ios => "17.0" }

  s.source_files = [
    "ios/**/*.{swift,h,m,mm,cpp}",
    "nitrogen/generated/ios/**/*.{swift,h,m,mm,cpp}",
    "nitrogen/generated/shared/**/*.{hpp,cpp,h}"
  ]

  # Uses face-detection for MLKit face finding
  s.dependency "NitroMLKitFaceDetection"
  s.dependency "NitroModules"

  # MobileFaceNet model (Apache 2.0, ~5MB)
  s.resource_bundles = {
    "NitroMLKitFaceRecognitionModels" => ["ios/models/*.tflite"]
  }

  s.pod_target_xcconfig = {
    "SWIFT_VERSION" => "5.9",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "DEFINES_MODULE" => "YES"
  }
end
